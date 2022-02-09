//sitelock
const _0x1918 = ['top', 'indexOf', 'aHR0cHM6Ly9wb2tpLmNvbS9zaXRlbG9jaw==', 'hostname', 'length', 'location', 'LnBva2ktZ2RuLmNvbQ==', 'href'];
(function(_0x4a02b5, _0x5c0c3d) {
    const _0x56a85d = function(_0x375c0e) {
        while (--_0x375c0e) {
            _0x4a02b5.push(_0x4a02b5.shift());
        }
    };
    _0x56a85d(++_0x5c0c3d);
}(_0x1918, 0x1ae));
const _0xcdc9 = function(_0x4a02b5, _0x5c0c3d) {
    _0x4a02b5 -= 0x0;
    const _0x56a85d = _0x1918[_0x4a02b5];
    return _0x56a85d;
};
(function checkInit() {}());
let href = {};
//Парсинг входных данных
if (window.location.href.indexOf("?") > -1) {
    let query = window.location.href.substr(window.location.href.indexOf("?") + 1).split("&");
    for (let index = 0; index < query.length; index++) {
        let param = query[index].split("=");
        href[param[0]] = param[1];
    }
}
let connectorKey = appConfig["platforms"]["default"];
let connector = new Connector();
connector.init(appConfig);

function getConfig(callback) {
    callback(appConfig);
}

function prepare(data, callback) {
    connector.prepare(data, callback);
}

function login(platform, callback) {
    connector.login(callback);
}

function logout(callback) {
    connector.logout(callback);
}

function save(platform, callback) {
    callback(true);
}

function initNotifications(callback) {
    connector.initNotifications(callback);
}

function share(object, callback) {
    connector.share(object, callback);
}

function showPayment(data, callback) {
    connector.showPayment(data, callback);
}

function showSubscription(data, callback) {
    connector.showSubscription(data, callback);
}

function requestFriend(data, callback) {
    connector.requestFriend(data, callback);
}

function getUserSaves(callback) {
    connector.getUserSaves(callback);
}

function addUserSaves(data, callback) {
    connector.addUserSaves(data, callback);
}

function inviteFriends(data, callback) {
    connector.inviteFriends(data, callback);
}

function getFriends(callback) {
    connector.getFriends(callback);
}

function getFriendsInApp(callback) {
    connector.getFriendsInApp(callback);
}

function getUsersInfo(ids, callback) {
    connector.getUsersInfo(ids, callback);
}

function isFavorite(callback) {
    connector.isFavorite(callback);
}

function toFavorite(callback) {
    connector.toFavorite(callback);
}

function isCommunityMember(callback) {
    connector.isCommunityMember(callback);
}

function joinCommunity(callback) {
    connector.joinCommunity(callback);
}

function setLeaderboard(id, score) {
    connector.setLeaderboard(id, score);
}

function getAuthData(platform, callback) {
    return connector.getAuthData(callback);
}

function getLanguage() {
    return connector.getLanguage();
}

function getUid() {
    return connector.getUid();
}

function getAppVersions(key) {
    return appVersions[key];
}

function getActivePlatform() {
    return connectorKey;
}

function debugLog(...args) {
    // console.log(args);
}