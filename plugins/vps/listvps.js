import axios from 'axios'
import { identityOf } from '../../src/lib/terboo-identity.js'
import config from '../../config.js'
import te from '../../src/lib/terboo-error.js'

const pluginConfig = {
    name: "listvps",
    alias: ["vpslist"],
    category: 'vps',
    description: 'عرض جميع VPS من DigitalOcean',
    usage: '.listvps',
    example: '.listvps',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: true, // V6: يعرض كلمات مرور/عناوين — الخاص فقط
    cooldown: 10,
    energi: 0,
    // V6 (§23): مسار DigitalOcean قديم معزول — لا يعمل إلا بتفعيل صريح من المالك، وخارج سجل الذكاء
    legacy: "digitalocean",
    isEnabled: config.digitalocean?.legacyEnabled === true
}

function hasAccess(sender, isOwner) {
    if (isOwner) return true
    // LID ⇒ رقم الهاتف من الهوية (البائعون محفوظون بأرقام هواتف)
    const cleanSender = identityOf(String(sender || '')).number || sender?.split('@')[0]
    if (!cleanSender) return false
    const doConfig = config.digitalocean || {}
    return (doConfig.sellers || []).includes(cleanSender) || 
           (doConfig.ownerPanels || []).includes(cleanSender)
}

async function handler(m, { sock }) {
    const token = config.digitalocean?.token
    
    if (!token) {
        return m.reply(`⚠️ *لم يتم إعداد DigitalOcean*`)
    }
    
    if (!hasAccess(m.sender, m.isOwner)) {
        return m.reply(`❌ *تم رفض الوصول*`)
    }
    
    await m.reply(`🕕 *جاري جلب بيانات VPS...*`)
    
    try {
        const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        const droplets = response.data.droplets || []
        
        if (droplets.length === 0) {
            return m.reply(`📋 *قائمة VPS*\n\n> لا توجد VPS متاحة.`)
        }
        
        let txt = `📋 *قائمة VPS من DigitalOcean*\n`
        txt += `> المجموع: ${droplets.length} دروبليت\n\n`
        
        for (const droplet of droplets) {
            const ip = droplet.networks?.v4?.find(n => n.type === 'public')?.ip_address || '-'
            const status = droplet.status === 'active' ? '🟢' : '🔴'
            
            txt += `\n`
            txt += `> ◈ ${status} *${droplet.name}*\n`
            txt += `> ◈ 🆔 المعرف: ${droplet.id}\n`
            txt += `> ◈ 🌐 IP: ${ip}\n`
            txt += `> ◈ 💾 الرام: ${droplet.memory} MB\n`
            txt += `> ◈ ⚡ المعالج: ${droplet.vcpus} vCPU\n`
            txt += `> ◈ 💿 المساحة: ${droplet.disk} GB\n`
            txt += `> ◈ 📍 المنطقة: ${droplet.region?.slug || '-'}\n`
            txt += `\n\n`
        }
        
        await m.reply(txt)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }