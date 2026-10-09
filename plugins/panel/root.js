// إلغاء_تثبيت_القالب - أمر لإلغاء تثبيت قالب Pterodactyl عبر SSH
// على طبقة SSH الآمنة: مضيف مسجّل (.ssh add) بسر مشفّر وبصمة مثبّتة — لا كلمة مرور في نص الرسالة.
// الوصفة الثابتة ورموز الخروج الحقيقية في src/lib/terboo-ssh-recipes.js

import { runLegacyRecipe } from '../../src/lib/terboo-ssh-recipes.js'

const pluginConfig = {
    name: ['إلغاء_تثبيت_القالب'],
    alias: ['uinstalltema', 'uninstalltema', 'removetema', 'hapustema'],
    category: 'panel',
    description: 'إلغاء تثبيت قالب Pterodactyl عبر SSH',
    usage: '.إلغاء_تثبيت_القالب <معرّف_الخادم>',
    example: '.إلغاء_تثبيت_القالب lab',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    return runLegacyRecipe(m, sock, { recipe: 'ptero-theme-uninstall', links: [] })
}

export { pluginConfig as config, handler }
