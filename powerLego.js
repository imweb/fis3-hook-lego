var _ = fis.util,
    fs = _.fs,
    compare = require('compare-version'),
    root = 'lego_modules';


module.exports = {
    reg: /^[\.\/]*?lego_modules\/([^@\/]+)(@\d+\.\d+\.\d+)?\/(.*)$/,
    lookup: function (id, opts) {
        var versions,
            match = id.match(this.reg),
            lego = fis.project.getProjectPath(root),
            pkgName = match && match[1] || '',
            ver = match && match[2] || '',
            subFile = match && match[3] || '';
        // 做一次快速判断
        if (!pkgName || !getListAll(root)[pkgName]) {
            return null;
        }

        fis.log.debug('lego: get %s from <lego_modules>', id);

        if (!_.isDir(_(lego, pkgName))) {
            return fis.log.info('lego: 找不到 lego 组件 %s 的目录', id);
        }

        if (!ver) { // 默认最新
            versions = fs.readdirSync(_(lego, pkgName)) || [];

            if (versions.length > 1) {
                versions = versions.sort(function (prev, cur) {
                    return compare(prev, cur) <= 0;
                });
            }

            ver = versions[0];
        }


        if (!_.isDir(_(lego, pkgName, ver))) {
            return fis.log.info('lego: 找不到 lego 组件 %s 的对应的版本', id, ver);
        }

        if (!subFile) {
            try {
                subFile = require(_(lego, pkgName, ver, 'package.json'))
                    .lego.main;
            } catch (ex) {
                // 如果不存在 package.json
                fis.log.info('lego: 组件 %s 没有 package.json', id);
            }
        }

        if (!_.isFile(_(lego, pkgName, ver, subFile))) {
            return fis.log.info('lego: 找不到 lego 组件 %s 的对应的文件', id, subFile);
        }

        return fis.uri(_(root, pkgName, ver, subFile));
    }
};


/**
 * 每一个文件都会经过lookup，防止频繁的判断文件是否存在，先列出一级目录，以备快速判断
 */
var _listAll = {};

function getListAll(root) {
    var path;
    if (!_listAll[root]) {
        _listAll[root] = {};
        path = fis.project.getProjectPath(root);
        if (_.isDir(path)) {
            fs.readdirSync(path).forEach(function (item) {
                _listAll[root][item] = true;
            });
        }
    }
    return _listAll[root];
};