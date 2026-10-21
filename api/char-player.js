/* 只显示人物 + 自建动作播放器（按 moc3 的参数顺序解析下标） */
(function () {
  "use strict";

  /* 按 model_list 下标配置：隐藏的 part、缩放、下移 */
  var CFG = {
    "0": { hide: [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36], scale: 1.00, bottom: 0 },   // Shalom_3
    "1": { hide: [2, 4, 5, 6, 9, 10, 11, 12, 13, 21], scale: 1.00, bottom: 0 },                // Shalom_4
    "2": { hide: [2, 6, 26], scale: 1.00, bottom: 0 },                                          // Angel_5
    "3": { hide: [], scale: 1.00, bottom: 0 },                                                   // Coquelicot_3
    "4": { hide: [], scale: 1.00, bottom: 0 },                                                   // Duruo_3
    "5": { hide: [4, 6, 9, 84], scale: 1.00, bottom: 0 },                                        // Eleven_4
    "6": { hide: [14], scale: 1.00, bottom: 0 },                                                 // Jasmine_3
    "7": { hide: [], scale: 1.00, bottom: 0 }                                                    // jichuan_2
  };

  var cache = {};
  var paramIndex = null;     // { id: index } 来自 moc3 参数顺序
  var paramLoadedFor = null;
  var timer = null;
  var cur = null, curStart = 0;
  var debug = { motion: null, taps: 0, plays: 0, curves: 0 };
  var playback = { cur: null, t0: 0 };
  window.__l2dPlayback = playback;

  function installHook(m) {
    var md = m.getModel();
    if (!md || md.__hooked) return;
    md.__hooked = true;
    var orig = md.update.bind(md);
    md.update = function () {
      var p = playback;
      if (p.cur) {
        var t = (performance.now() - p.t0) / 1000;
        for (var k = 0; k < p.cur.curves.length; k++) {
          md.setParameterValueByIndex(p.cur.curves[k].i, valueAt(p.cur.curves[k].s, t));
        }
      }
      return orig();
    };
  }
  window.__l2dDebug = debug;

  function valueAt(s, t) {
    if (t <= s[0]) return s[1];
    var i = 2, pt = s[0], pv = s[1];
    while (i < s.length) {
      var ty = s[i];
      if (ty === 0) {
        var nt = s[i + 1], nv = s[i + 2];
        if (t <= nt) { var r = (t - pt) / ((nt - pt) || 1); return pv + (nv - pv) * r; }
        pt = nt; pv = nv;
      }
      i += 3;
    }
    return pv;
  }

  function modelName() {
    var id = localStorage.getItem("modelId") || "0";
    return id === "1" ? "Shalom_4" : "Shalom_3";
  }

  function ensureParams(m) {
    var name = modelName();
    if (paramLoadedFor === name || paramIndex) return Promise.resolve(paramIndex);
    return fetch("/api/model/5732/" + name + "/params.json")
      .then(function (r) { return r.json(); })
      .then(function (ids) {
        var map = {};
        for (var i = 0; i < ids.length; i++) map[ids[i]] = i;
        paramIndex = map;
        paramLoadedFor = name;
        return map;
      })
      .catch(function () { return null; });
  }

  function play(m, file, onEnd) {
    ensureParams(m).then(function (map) {
      if (!map) return;
      if (cache[file]) { start(m, cache[file], file, onEnd); return; }
      fetch("/api/model/5732/" + modelName() + "/" + String(file).replace(/^\/+/, ""))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var curves = [];
          j.Curves.forEach(function (c) {
            if (c.Target !== "Parameter") return;
            var i = map[c.Id];
            if (i === undefined) return;
            curves.push({ i: i, s: c.Segments });
          });
          var data = { curves: curves, dur: j.Meta.Duration };
          cache[file] = data;
          start(m, data, file, onEnd);
        })
        .catch(function () {});
    });
  }

  function start(m, data, file, onEnd) {
    installHook(m);
    playback.cur = data;
    playback.t0 = performance.now();
    debug.motion = file; debug.plays++; debug.curves = data.curves.length;

    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      var m2 = window.__l2dModel;
      if (!m2 || !playback.cur) return;
      if ((performance.now() - playback.t0) / 1000 >= playback.cur.dur) {
        clearInterval(timer); timer = null;
        if (onEnd) onEnd(m2); else idle(m2);
      }
    }, 100);
  }

  function motionFiles(m, group) {
    var st = m._modelSetting, out = [];
    var n = st.getMotionCount(group);
    for (var i = 0; i < n; i++) out.push(st.getMotionFileName(group, i));
    return out;
  }

  function idle(m) {
    var files = motionFiles(m, "Idle");
    if (!files.length) return;
    play(m, files[Math.floor(Math.random() * files.length)], null);
  }

  function tap(m) {
    debug.taps++;
    var files = motionFiles(m, "TapBody").filter(function (f) { return f.indexOf("Click") >= 0; });
    if (!files.length) files = motionFiles(m, "TapBody");
    if (!files.length) return idle(m);
    play(m, files[Math.floor(Math.random() * files.length)], function (mm) { idle(mm); });
  }
  window.__l2dTap = function () { var m = window.__l2dModel; if (m) tap(m); };

  function killEngineMotions(model) {
    if (!model || model.__motionsKilled) return;
    model.__motionsKilled = true;
    model.startMotion = function () { return null; };
    model.startRandomMotion = function () { return null; };
  }

  document.addEventListener("click", function (e) {
    var m = window.__l2dModel, c = document.getElementById("live2d");
    if (!m || !c) return;
    var r = c.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right) return;
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    tap(m);
  }, true);

  var lastModel = null, lastId = null;

  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;
    killEngineMotions(m);

    var c = m.getModel();
    if (!c || typeof c.setPartOpacityByIndex !== "function") return;

    var id = localStorage.getItem("modelId") || "0";
    if (m === lastModel && id === lastId) return;

    var cfg = CFG[id] || { hide: [], scale: 1, bottom: 0 };
    for (var i = 0; i < cfg.hide.length; i++) c.setPartOpacityByIndex(cfg.hide[i], 0);

    var canvas = document.getElementById("live2d");
    var f = { scale: cfg.scale, bottom: cfg.bottom };
    if (canvas) {
      canvas.style.transformOrigin = "50% 100%";
      canvas.style.transform = "scale(" + f.scale + ")";
      canvas.style.bottom = f.bottom + "px";
    }

    paramIndex = null;
    paramLoadedFor = null;
    lastModel = m; lastId = id;
    setTimeout(function () { idle(m); }, 300);
  }, 400);
})();