import axios from 'axios'
import { identityOf } from '../../src/lib/terboo-identity.js'
import config from '../../config.js'
import te from '../../src/lib/terboo-error.js'

const pluginConfig = {
    name: "delvps",
    alias: ["deldroplet"],
    category: 'vps',
    description: 'حذف VPS من DigitalOcean',
    usage: '.delvps <id>',
    example: '.delvps 123456789',
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
    
    const dropletId = m.text?.trim()
    if (!dropletId) {
        return m.reply(`⚠️ *طريقة الاستخدام*\n\n> ${m.prefix}delvps <معرف_الدروبليت>\n\n> استخدم ${m.prefix}listvps لعرض المعرفات`)
    }
    
    await m.reply(`🗑️ *جاري حذف VPS...*\n\n> المعرف: ${dropletId}`)
    
    try {
        await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        
        m.react('✅')
        await m.reply(`✅ *تم حذف VPS بنجاح*\n\n> المعرف: ${dropletId}`)
        
    } catch (err) {
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }