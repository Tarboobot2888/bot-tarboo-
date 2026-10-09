// تثبيت قالب ستيلار - أمر لتثبيت قالب ستيلار للوحة Pterodactyl عبر SSH
// على طبقة SSH الآمنة: مضيف مسجّل (.ssh add) بسر مشفّر وبصمة مثبّتة — لا كلمة مرور في نص الرسالة.
// الوصفة الثابتة ورموز الخروج الحقيقية في src/lib/terboo-ssh-recipes.js

import { runLegacyRecipe } from '../../src/lib/terboo-ssh-recipes.js'

const pluginConfig = {
    name: 'تثبيت_قالب_ستيلار',
    alias: ['installtemastellar'],
    category: 'panel',
    description: 'تثبيت قالب ستيلار للوحة Pterodactyl عبر SSH',
    usage: '.تثبيت_قالب_ستيلار <معرّف_الخادم>',
    example: '.تثبيت_قالب_ستيلار lab',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    return runLegacyRecipe(m, sock, { recipe: 'ptero-theme-stellar', links: [] })
}

export { pluginConfig as config, handler }
