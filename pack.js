/**
 * pack
 * @author jerojiang
 * @date 2015-09-18
 */

var _ = fis.util;

module.exports = function(ret, pack, opts) {
    if (!(_.isEmpty(pack))) {
        return;
    }

    var packager = _.applyMatches('::package', fis.media().getSortedMatches());
    var files = ret.src;

    // if (packager.lego.autoLoad) {
    //
    // }

    Object.keys(files).forEach(function(subpath) {
        var file = files[subpath];

        if (file.isHtmlLike) {
            var requires = file.requires;

            console.log(requires);
        }
    });
};
