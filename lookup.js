/**
 * 查找依赖
 * @author jerojiang
 *
 *  默认最新 require('zepto') -> require('zepto/x.x.x/zepto')
 *  指定版本号 require('zepto@1.2.3') -> require('zepto/1.2.3')
 *  modules 目录覆盖 require('zepto') -> require('modules/zepto')
 */

var _ = fis.util,
    fs = _.fs,
    compare = require('compare-version');

module.exports = function(id, opts) {
    var ignore = opts.ignore,
        ret;
    // 剔除后缀
    id = id.replace(/\.js$/, '');

    if (typeof ignore === 'string') {
        ignore = [opts.ignore];
    } else {
        ignore = opts.ignore || [];
    }

    if (ignore.indexOf(id) > -1) {
        fis.log.debug('lego: ignore module %s', id);
        return null;
    }

    opts.paths.every(function(item) {
        if (item.type === 'lego') {
            ret = getLegoModule(item.location, id);
        } else {
            ret = getModule(item.location, id);
        }
        return !ret;
    });
    return ret || null;
};

/**
 * 从 modules 目录获取模块
 * @param {String} root 目录
 * @param  {String} id 就是 require('zepto') 中的 zepto
 */
function getModule(root, id) {
    var mod = fis.project.getProjectPath(root);

    // 不处理多级目录
    // 快速判断
    if (id.indexOf('\/') !== -1
        || (!getListAll(root)[id + '.js'] && !getListAll(root)[id])
    ) {
        return null;
    }

    if (_.isFile(_(mod, id + '.js'))) {
        fis.log.debug('lego: get %s from <modules>', id);
        return fis.uri(_(root, id + '.js'));
    } else if (_.isFile(_(mod, id, id + '.js'))) {
        fis.log.debug('lego: get %s from <modules>', id + '/' + id);
        return fis.uri(_(root, id, id + '.js'));
    }

    return null;
}

/**
 * 从 lego_modules 下获取模块
 * @param {String} root 目录
 * @param  {String} id 就是 require('zepto') 中的 zepto
 */
function getLegoModule(root, id) {
    var ver, versions, 
        lego = fis.project.getProjectPath(root),
        match = id.match(/^\/?([^@\/]+)(@([^\/]*))?(\/(.*)+)?$/);
        pkgName = match && match[1] || '',
        ver = match && match[3] || '',
        subFile = match && match[5] || '';

    // 做一次快速判断
    if (!pkgName || !getListAll(root)[pkgName]) {
        return null;
    }

    fis.log.debug('lego: get %s from <lego_modules>', id);

    if (!_.isDir(_(lego, pkgName))) {
        return fis.log.error('lego: 找不到 lego 组件 %s 的目录', id);
    }

    if (!ver) { // 默认最新
        versions = fs.readdirSync(_(lego, pkgName)) || [];

        if (versions.length > 1) {
            versions = versions.sort(function(prev, cur) {
                return compare(prev, cur) <= 0;
            });
        }

        ver = versions[0];
    }

    if (!_.isDir(_(lego, pkgName, ver))) {
        return fis.log.error('lego: 找不到 lego 组件 %s 的对应的版本', id, ver);
    }

    if (!subFile) {
        try {
            subFile = require(_(lego, pkgName, ver, 'package.json'))
                .lego.main.replace(/\.js$/, '');
        } catch (ex) {
            // 如果不存在 package.json
            fis.log.info('lego: 组件 %s 没有 package.json', id);
        }

        // main
        // zepto/x.x.x/zepto.js 同名文件
        // zepto/x.x.x/index.js index 文件
        [subFile, pkgName, 'index'].every(function(item) {
            subFile = item;
            return !item || !_.isFile(_(lego, pkgName, ver, item + '.js')); 
        });
    }

    if (!_.isFile(_(lego, pkgName, ver, subFile + '.js'))) {
        return fis.log.error('lego: 找不到 lego 组件 %s 的对应的文件', id, subFile);
    }

    return fis.uri(_(root, pkgName, ver, subFile + '.js'));
}

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
            fs.readdirSync(path).forEach(function(item) {
                _listAll[root][item] = true;
            });
        }
    }
    return _listAll[root];
};

