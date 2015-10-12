/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup');

module.exports = function init(fis, opts) {
    fis.set('idMaps', {});
    fis.on('lookup:file', function(info, file) {

        // 暂时只分析 js 文件，后续 Ques 可以这里搞起
        if (file.isJsLike && /^[a-zA-Z0-9_@.-]+$/.test(info.rest)) {
            var ret = lookup(info.rest);
            // hook 会修改文件的id，这里把这种修改记录下来，方便其他模块调用
            var idMaps = fis.get('idMaps');
            if(!idMaps[ret]) {
                idMaps[ret] = info.rest;
            }
            
            fis.set('idMaps', idMaps);
            
            if (ret) {
                info.id = info.moduleId = ret;
            }
        }
    });
};
