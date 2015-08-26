/**
 * lego mmodule hook
 * @author jerojiang
 * @link http://lego.imweb.io/
 */
var lookup = require('./lookup');

module.exports = function init(fis, opts) {
    fis.on('lookup:file', function(info, file) {
        if (/^[a-zA-Z0-9_@.-]+$/.test(info.rest)) {
            var ret = lookup(info.rest); 
            info.id = info.moduleId = ret;
        }
    });
};