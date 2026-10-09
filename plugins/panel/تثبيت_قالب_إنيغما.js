// تثبيت قالب إنيغما - أمر لتثبيت قالب إنيغما للوحة Pterodactyl عبر SSH
// على طبقة SSH الآمنة: مضيف مسجّل (.ssh add) بسر مشفّر وبصمة مثبّتة — لا كلمة مرور في نص الرسالة.
// الوصفة الثابتة ورموز الخروج الحقيقية في src/lib/terboo-ssh-recipes.js

import { runLegacyRecipe } from '../../src/lib/terboo-ssh-recipes.js'

const pluginConfig = {
    name: 'تثبيت_قالب_إنيغما',
    alias: ['installtemaenigma'],
    category: 'panel',
    description: 'تثبيت قالب إنيغما للوحة Pterodactyl عبر SSH',
    usage: '.تثبيت_قالب_إنيغما <معرّف_الخادم> <wa> <group> <channel>',
    example: '.تثبيت_قالب_إنيغما lab https://wa.me/20100 https://chat.whatsapp.com/x https://whatsapp.com/channel/x',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    return runLegacyRecipe(m, sock, { recipe: 'ptero-theme-enigma', links: ['wa', 'group', 'channel'] })
}

export { pluginConfig as config, handler }
