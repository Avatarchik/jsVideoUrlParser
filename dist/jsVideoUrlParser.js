function UrlParser() {
  'use strict';
  this.plugins = {};
}

UrlParser.prototype.parseProvider = function (url) {
  'use strict';
  var match = url.match(
    /(?:(?:https?:)?\/\/)?(?:[^\.]+\.)?(\w+)\./i
  );
  return match ? match[1] : undefined;
};

UrlParser.prototype.removeEmptyParameters = function (result) {
  'use strict';
  if (result.params && Object.keys(result.params).length === 0) {
    delete result.params;
  }
  return result;
};

UrlParser.prototype.parse = function (url) {
  'use strict';
  var _this = this;
  var provider = _this.parseProvider(url);
  var result;
  var plugin = _this.plugins[provider];
  if (!provider || !plugin || !plugin.parse) {
    return undefined;
  }
  result = plugin.parse.apply(
    plugin, [url, getQueryParams(url)]
  );
  if (result) {
    result = _this.removeEmptyParameters(result);
    result.provider = plugin.provider;
  }
  return result;
};

UrlParser.prototype.bind = function (plugin) {
  'use strict';
  this.plugins[plugin.provider] = plugin;
  if (plugin.alternatives) {
    for (var i = 0; i < plugin.alternatives.length; i += 1) {
      this.plugins[plugin.alternatives[i]] = plugin;
    }
  }
};

UrlParser.prototype.create = function (op) {
  'use strict';
  var vi = op.videoInfo;
  var params = op.params;
  var plugin = this.plugins[vi.provider];

  params = (params === 'internal') ? vi.params : params || {};

  if (plugin) {
    op.format = op.format || plugin.defaultFormat;
    if (plugin.formats.hasOwnProperty(op.format)) {
      return plugin.formats[op.format].apply(plugin, [vi, cloneObject(params)]);
    }
  }
  return undefined;
};
var urlParser = new UrlParser();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = urlParser;
}

/*jshint unused:false */
function cloneObject(obj) {
  /*jshint unused:true */
  'use strict';
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  var temp = obj.constructor(); // give temp the original obj's constructor
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      temp[key] = cloneObject(obj[key]);
    }
  }

  return temp;
}

/*jshint unused:false */
function getQueryParams(qs) {
  /*jshint unused:true */
  'use strict';
  if (typeof qs !== 'string') {
    return {};
  }
  qs = qs.split('+').join(' ');

  var params = {};
  var match = qs.match(
    /*jshint ignore:start */
    /(?:[\?](?:[^=]+)=(?:[^&#]*)(?:[&](?:[^=]+)=(?:[^&#]*))*(?:[#].*)?)|(?:[#].*)/
    /*jshint ignore:end */
  );
  var split;

  if (match === null) {
    return {};
  }

  split = match[0].substr(1).split(/[&#=]/);

  for (var i = 0; i < split.length; i += 2) {
    params[decodeURIComponent(split[i])] =
      decodeURIComponent(split[i + 1] || '');
  }

  return params;
}

/*jshint unused:false */
function combineParams(op) {
  /*jshint unused:true */
  'use strict';
  if (typeof op !== 'object') {
    return '';
  }
  op.params = op.params || {};
  var combined = '',
    i = 0,
    keys = Object.keys(op.params);

  if (keys.length === 0) {
    return '';
  }

  //always have parameters in the same order
  keys.sort();

  if (!op.hasParams) {
    combined += '?' + keys[0] + '=' + op.params[keys[0]];
    i += 1;
  }

  for (; i < keys.length; i += 1) {
    combined += '&' + keys[i] + '=' + op.params[keys[i]];
  }
  return combined;
}

//parses strings like 1h30m20s to seconds
/*jshint unused:false */
function getTime(timeString) {
  /*jshint unused:true */
  'use strict';
  var totalSeconds = 0;
  var timeValues = {
    's': 1,
    'm': 1 * 60,
    'h': 1 * 60 * 60,
    'd': 1 * 60 * 60 * 24,
    'w': 1 * 60 * 60 * 24 * 7
  };
  var timePairs;
  //is the format 1h30m20s etc
  if (!timeString.match(/^(\d+[smhdw]?)+$/)) {
    return 0;
  }
  //expand to "1 h 30 m 20 s" and split
  timeString = timeString.replace(/([smhdw])/g, ' $1 ').trim();
  timePairs = timeString.split(' ');

  for (var i = 0; i < timePairs.length; i += 2) {
    totalSeconds += parseInt(timePairs[i], 10) *
      timeValues[timePairs[i + 1] || 's'];
  }
  return totalSeconds;
}

function CanalPlus() {
  'use strict';
  this.provider = 'canalplus';
  this.defaultFormat = 'embed';
  this.formats = {
    embed: this.createEmbedUrl
  };
  this.mediaTypes = {
    VIDEO: 'video'
  };
}

CanalPlus.prototype.parseParameters = function (params) {
  'use strict';
  delete params.vid;
  return params;
};

CanalPlus.prototype.parse = function (url, params) {
  'use strict';
  var _this = this;
  var result = {
    mediaType: this.mediaTypes.VIDEO,
    id: params.vid
  };
  result.params = _this.parseParameters(params);

  if (!result.id) {
    return undefined;
  }
  return result;
};

CanalPlus.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  var url = 'http://player.canalplus.fr/embed/';
  params.vid = vi.id;

  url += combineParams({
    params: params
  });
  return url;
};

urlParser.bind(new CanalPlus());

function Coub() {
  'use strict';
  this.provider = 'coub';
  this.defaultFormat = 'long';
  this.formats = {
    long: this.createLongUrl,
    embed: this.createEmbedUrl
  };
  this.mediaTypes = {
    VIDEO: 'video'
  };
}

Coub.prototype.parseUrl = function (url) {
  'use strict';
  var match = url.match(
    /(?:embed|view)\/([a-zA-Z\d]+)/i
  );
  return match ? match[1] : undefined;
};

Coub.prototype.parse = function (url, params) {
  'use strict';
  var result = {
    mediaType: this.mediaTypes.VIDEO,
    params: params,
    id: this.parseUrl(url)
  };

  if (!result.id) {
    return undefined;
  }
  return result;
};

Coub.prototype.createUrl = function (baseUrl, vi, params) {
  'use strict';
  var url = baseUrl + vi.id;
  url += combineParams({
    params: params
  });
  return url;
};

Coub.prototype.createLongUrl = function (vi, params) {
  'use strict';
  return this.createUrl('https://coub.com/view/', vi, params);
};

Coub.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  return this.createUrl('//coub.com/embed/', vi, params);
};

urlParser.bind(new Coub());

function Dailymotion() {
  'use strict';
  this.provider = 'dailymotion';
  this.alternatives = ['dai'];
  this.defaultFormat = 'long';
  this.formats = {
    short: this.createShortUrl,
    long: this.createLongUrl,
    embed: this.createEmbedUrl
  };
  this.mediaTypes = {
    VIDEO: 'video'
  };
}

Dailymotion.prototype.parseParameters = function (params) {
  'use strict';
  return this.parseTime(params);
};

Dailymotion.prototype.parseTime = function (params) {
  'use strict';
  if (params.start) {
    params.start = getTime(params.start);
  }
  return params;
};

Dailymotion.prototype.parseUrl = function (url) {
  'use strict';
  var match = url.match(/(?:\/video|ly)\/([A-Za-z0-9]+)/i);
  return match ? match[1] : undefined;
};

Dailymotion.prototype.parse = function (url, params) {
  'use strict';
  var _this = this;
  var result = {
    mediaType: this.mediaTypes.VIDEO,
    params: _this.parseParameters(params),
    id: _this.parseUrl(url)
  };
  return result.id ? result : undefined;
};

Dailymotion.prototype.createUrl = function (base, vi, params) {
  'use strict';
  return base + vi.id +
    combineParams({
      params: params
    });
};

Dailymotion.prototype.createShortUrl = function (vi) {
  'use strict';
  return this.createUrl('https://dai.ly/', vi, {});
};

Dailymotion.prototype.createLongUrl = function (vi, params) {
  'use strict';
  return this.createUrl('https://dailymotion.com/video/', vi, params);
};

Dailymotion.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  return this.createUrl('//www.dailymotion.com/embed/video/', vi, params);
};

urlParser.bind(new Dailymotion());

function Twitch() {
  'use strict';
  this.provider = 'twitch';
  this.defaultFormat = 'long';
  this.formats = {
    long: this.createLongUrl,
    embed: this.createEmbedUrl
  };
  this.mediaTypes = {
    VIDEO: 'video',
    STREAM: 'stream',
    EMBEDVIDEO: 'embed-video'
  };
}

Twitch.prototype.seperateId = function (id) {
  'use strict';
  return {
    pre: id[0],
    id: id.substr(1)
  };
};

Twitch.prototype.parseChannel = function (result, params) {
  'use strict';
  /*jshint camelcase:false */
  var channel = params.channel || params.utm_content || result.channel;
  delete params.utm_content;
  /*jshint camelcase:true */
  delete params.channel;
  return channel;
};


Twitch.prototype.parseUrl = function (url, result, params) {
  'use strict';
  var match;
  match = url.match(
    /twitch\.tv\/(\w+)(?:\/(.)\/(\d+))?/i
  );
  result.channel = match ? match[1] : undefined;
  if (match && match[2] && match[3]) {
    result.id = match[2] + match[3];
  } else if (params.video) {
    result.id = params.video;
    delete params.video;
  }
  return result;
};

Twitch.prototype.parseMediaType = function (result) {
  'use strict';
  var mediaType;
  if (result.channel) {
    mediaType = result.id ? this.mediaTypes.VIDEO : this.mediaTypes.STREAM;
  } else if (result.id) {
    mediaType = this.mediaTypes.EMBEDVIDEO;
    delete result.channel;
  }
  return mediaType;
};

Twitch.prototype.parseParameters = function (params) {
  'use strict';
  if (params.t) {
    params.start = getTime(params.t);
    delete params.t;
  }
  return params;
};

Twitch.prototype.parse = function (url, params) {
  'use strict';
  var _this = this;
  var result = {};
  result = _this.parseUrl(url, result, params);
  result.channel = _this.parseChannel(result, params);
  result.mediaType = _this.parseMediaType(result);
  result.params = _this.parseParameters(params);
  return result.channel || result.id ? result : undefined;
};

Twitch.prototype.createLongUrl = function (vi, params) {
  'use strict';
  var url = '';

  if (vi.mediaType === this.mediaTypes.STREAM) {
    url = 'https://twitch.tv/' + vi.channel;
  } else if (vi.mediaType === this.mediaTypes.VIDEO) {
    var sep = this.seperateId(vi.id);
    url = 'https://twitch.tv/' + vi.channel + '/' + sep.pre + '/' + sep.id;
    if (params.start) {
      params.t = params.start + 's';
      delete params.start;
    }
  }
  url += combineParams({
    params: params
  });

  return url;
};

Twitch.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  var url = 'https://player.twitch.tv/';

  if (vi.mediaType === this.mediaTypes.STREAM) {
    params.channel = vi.channel;
  } else if (vi.mediaType === this.mediaTypes.VIDEO ||
    vi.mediaType === this.mediaTypes.EMBEDVIDEO) {
    params.video = vi.id;
    if (params.start) {
      params.t = params.start + 's';
      delete params.start;
    }
  }

  url += combineParams({
    params: params
  });

  return url;
};

urlParser.bind(new Twitch());

function Vimeo() {
  'use strict';
  this.provider = 'vimeo';
  this.alternatives = ['vimeopro'];
  this.defaultFormat = 'long';
  this.formats = {
    long: this.createLongUrl,
    embed: this.createEmbedUrl
  };
  this.mediaTypes = {
    VIDEO: 'video'
  };
}

Vimeo.prototype.parseUrl = function (url) {
  'use strict';
  var match = url.match(
    /*jshint ignore:start */
    /(?:\/(?:channels\/[\w]+|(?:(?:album\/\d+|groups\/[\w]+)\/)?videos?))?\/(\d+)/i
    /*jshint ignore:end */
  );
  return match ? match[1] : undefined;
};

Vimeo.prototype.parseParameters = function (params) {
  'use strict';
  return this.parseTime(params);
};

Vimeo.prototype.parseTime = function (params) {
  'use strict';
  if (params.t) {
    params.start = getTime(params.t);
    delete params.t;
  }
  return params;
};

Vimeo.prototype.parse = function (url, params) {
  'use strict';
  var result = {
    mediaType: this.mediaTypes.VIDEO,
    params: this.parseParameters(params),
    id: this.parseUrl(url)
  };
  return result.id ? result : undefined;
};

Vimeo.prototype.createUrl = function (baseUrl, vi, params) {
  'use strict';
  var url = baseUrl + vi.id;
  var startTime = params.start;
  delete params.start;

  url += combineParams({
    params: params
  });

  if (startTime) {
    url += '#t=' + startTime;
  }
  return url;
};

Vimeo.prototype.createLongUrl = function (vi, params) {
  'use strict';
  return this.createUrl('https://vimeo.com/', vi, params);
};

Vimeo.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  return this.createUrl('//player.vimeo.com/video/', vi, params);
};

urlParser.bind(new Vimeo());

function YouTube() {
  'use strict';
  this.provider = 'youtube';
  this.alternatives = ['youtu', 'ytimg'];
  this.defaultFormat = 'long';
  this.formats = {
    short: this.createShortUrl,
    long: this.createLongUrl,
    embed: this.createEmbedUrl,
    shortImage: this.createShortImageUrl,
    longImage: this.createLongImageUrl
  };
  this.imageQualities = {
    '0': '0',
    '1': '1',
    '2': '2',
    '3': '3',
    DEFAULT: 'default',
    HQDEFAULT: 'hqdefault',
    SDDEFAULT: 'sddefault',
    MQDEFAULT: 'mqdefault',
    MAXRESDEFAULT: 'maxresdefault',
  };
  this.defaultImageQuality = this.imageQualities.HQDEFAULT;
  this.mediaTypes = {
    VIDEO: 'video',
    PLAYLIST: 'playlist',
    SHARE: 'share'
  };
}

YouTube.prototype.parseUrl = function (url) {
  'use strict';
  var match = url.match(
    /(?:(?:v|vi|be|videos|embed)\/(?!videoseries)|(?:v|ci)=)([\w\-]{11})/i
  );
  return match ? match[1] : undefined;
};

YouTube.prototype.parseTime = function (params) {
  'use strict';
  params.start = getTime(params.start || params.t);
  delete params.t;
  return params;
};

YouTube.prototype.parseParameters = function (params, result) {
  'use strict';
  if (params.start || params.t) {
    params.start = getTime(params.start || params.t);
    delete params.t;
  }
  if (params.v === result.id) {
    delete params.v;
  }
  if (params.list === result.id) {
    delete params.list;
  }

  return params;
};

YouTube.prototype.parseMediaType = function (result) {
  'use strict';
  if (result.params.list) {
    result.list = result.params.list;
    delete result.params.list;
  }
  if (result.id && !result.params.ci) {
    result.mediaType = this.mediaTypes.VIDEO;
  } else if (result.list) {
    delete result.id;
    result.mediaType = this.mediaTypes.PLAYLIST;
  } else if (result.params.ci) {
    delete result.params.ci;
    result.mediaType = this.mediaTypes.SHARE;
  } else {
    return undefined;
  }
  return result;
};

YouTube.prototype.parse = function (url, params) {
  'use strict';
  var _this = this;
  var result = {
    params: params,
    id: _this.parseUrl(url)
  };
  result.params = _this.parseParameters(params, result);
  result = _this.parseMediaType(result);
  return result;
};

YouTube.prototype.createShortUrl = function (vi, params) {
  'use strict';
  var url = 'https://youtu.be/' + vi.id;
  if (params.start) {
    url += '#t=' + params.start;
  }
  return url;
};

YouTube.prototype.createLongUrl = function (vi, params) {
  'use strict';
  var url = '';
  var startTime = params.start;
  delete params.start;

  if (vi.mediaType === this.mediaTypes.PLAYLIST) {
    params.feature = 'share';
    url += 'https://youtube.com/playlist';
  } else if (vi.mediaType === this.mediaTypes.VIDEO) {
    params.v = vi.id;
    url += 'https://youtube.com/watch';
  } else if (vi.mediaType === this.mediaTypes.SHARE) {
    params.ci = vi.id;
    url += 'https://www.youtube.com/shared';
  }

  if (vi.list) {
    params.list = vi.list;
  }

  url += combineParams({
    params: params
  });

  if (vi.mediaType !== this.mediaTypes.PLAYLIST && startTime) {
    url += '#t=' + startTime;
  }
  return url;
};

YouTube.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  var url = '//youtube.com/embed';

  if (vi.mediaType === this.mediaTypes.PLAYLIST) {
    params.listType = 'playlist';
  } else {
    url += '/' + vi.id;
    //loop hack
    if (params.loop === '1') {
      params.playlist = vi.id;
    }
  }

  if (vi.list) {
    params.list = vi.list;
  }

  url += combineParams({
    params: params
  });

  return url;
};

YouTube.prototype.createImageUrl = function (baseUrl, vi, params) {
  'use strict';
  var url = baseUrl + vi.id + '/';
  var quality = params.imageQuality || this.defaultImageQuality;

  return url + quality + '.jpg';
};

YouTube.prototype.createShortImageUrl = function (vi, params) {
  'use strict';
  return this.createImageUrl('https://i.ytimg.com/vi/', vi, params);
};

YouTube.prototype.createLongImageUrl = function (vi, params) {
  'use strict';
  return this.createImageUrl('https://img.youtube.com/vi/', vi, params);
};

urlParser.bind(new YouTube());

function Youku() {
  'use strict';
  this.provider = 'youku';
  this.defaultFormat = 'embed';
  this.formats = {
    embed: this.createEmbedUrl,
    long: this.createLongUrl,
    flash: this.createFlashUrl,
    static: this.createStaticUrl
  };
  this.mediaTypes = {
    VIDEO: 'video'
  };
}

Youku.prototype.parseUrl = function (url) {
  'use strict';
  var match = url.match(
    /(?:(?:embed|sid)\/|v_show\/id_|VideoIDS=)([a-zA-Z0-9]+)/
  );
  return match ? match[1] : undefined;
};

Youku.prototype.parseParameters = function (params) {
  'use strict';
  if (params.VideoIDS) {
    delete params.VideoIDS;
  }
  return params;
};

Youku.prototype.parse = function (url, params) {
  'use strict';
  var _this = this;
  var result = {
    mediaType: this.mediaTypes.VIDEO,
    id: _this.parseUrl(url),
    params: _this.parseParameters(params)
  };

  if (!result.id) {
    return undefined;
  }
  return result;
};

Youku.prototype.createUrl = function (baseUrl, vi, params) {
  'use strict';
  var url = baseUrl + vi.id;

  url += combineParams({
    params: params
  });
  return url;
};


Youku.prototype.createEmbedUrl = function (vi, params) {
  'use strict';
  return this.createUrl('http://player.youku.com/embed/', vi, params);
};

Youku.prototype.createLongUrl = function (vi, params) {
  'use strict';
  return this.createUrl('http://v.youku.com/v_show/id_', vi, params);
};

Youku.prototype.createStaticUrl = function (vi, params) {
  'use strict';
  return this.createUrl(
    'http://static.youku.com/v1.0.0638/v/swf/loader.swf?VideoIDS=',
    vi, params
  );
};

Youku.prototype.createFlashUrl = function (vi, params) {
  'use strict';
  var url = 'http://player.youku.com/player.php/sid/' + vi.id + '/v.swf';

  url += combineParams({
    params: params
  });
  return url;
};

urlParser.bind(new Youku());
