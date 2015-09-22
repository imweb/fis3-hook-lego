/**
 * pack
 * @author jerojiang
 * @date 2015-09-18
 */

'use strict';
var _ = fis.util;
var Page = require('./page');

module.exports = function(ret, pack, opts) {
    if (!_.isEmpty(pack)) { // 配置过打包的话，就不走 lego 智能打包
        return;
    }


    var packager = _.applyMatches('::package', fis.media().getSortedMatches());
    var files = ret.src;
    var ids = ret.ids;

    Object.keys(files).forEach(function(subpath) {
        var file = files[subpath];

        if (file.isHtmlLike && !file.page && file.requires && file.requires.length) {
            file.page = new Page(file, ids, packager.lego, ret); // 实例化一个页面
        }
    });
};
