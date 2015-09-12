/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup');

module.exports = function init(fis, opts) {
    fis.on('lookup:file', function(info, file) {

        // 暂时只分析 js 文件，后续 Ques 可以这里搞起
        if (file.isJsLike && /^[a-zA-Z0-9_@.-]+$/.test(info.rest)) {
            var ret = lookup(info.rest);
            if (ret) {
                info.id = info.moduleId = ret;
            }
        }
    });
};