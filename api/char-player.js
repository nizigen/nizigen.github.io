/* 只显示人物 + 自建动作播放器 */
(function () {
  "use strict";

  var HIDE = {
    "92":  [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36],
    "108": [2, 4, 5, 6, 9, 10, 11, 12, 13, 21]
  };
  var FRAME = { "0": { scale: 1.45, bottom: -55 }, "1": { scale: 1.70, bottom: -95 } };

  var cache = {};
  var timer = null;
  var curMotion = null;
  var curStart = 0;
  var debug = { motion: null, taps: 0, plays: 0 };
  window.__l2dDebug = debug;

  function valueAt(s, t) {
    if (t <= s[0]) return s[1];
    var i = 2, pt = s[0], pv = s[1];
    while (i < s.length) {
      var ty = s[i];
      if (ty === 0) {
        var nt = s[i + 1], nv = s[i + 2];
        if (t <= nt) {
          var r = (t - pt) / ((nt - pt) || 1);
          return pv + (nv - pv) * r;
        }
        pt = nt; pv = nv;
      }
      i += 3;
    }
    return pv;
  }

  function loadMotion(m, group, index) {
    var key = group + "_" + index;
    if (cache[key]) return Promise.resolve(cache[key]);
    var st = m._modelSetting;
    var file = st.getMotionFileName(group, index);
    var url = (m._modelHomeDir || "") + file;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var md = m.getModel();
      var idx = {};
      var curves = [];
      j.Curves.forEach(function (c) {
        if (c.Target !== "Parameter") return;
        if (!(c.Id in idx)) idx[c.Id] = md.getParameterIndex(c.Id);
        if (idx[c.Id] < 0) return;
        curves.push({ i: idx[c.Id], s: c.Segments });
      });
      var data = { curves: curves, dur: j.Meta.Duration };
      cache[key] = data;
      return data;
    }).catch(function () { return null; });
  }

  function play(m, group, index, onEnd) {
    loadMotion(m, group, index).then(function (data) {
      if (!data) return;
      curMotion = data;
      curStart = performance.now();
      debug.motion = group + "_" + index;
      debug.plays++;
      if (timer) clearInterval(timer);
      timer = setInterval(function () {
        var m2 = window.__l2dModel;
        if (!m2 || !curMotion) return;
        var t = (performance.now() - curStart) / 1000;
        if (t >= curMotion.dur) {
          clearInterval(timer);
          timer = null;
          if (onEnd) onEnd(m2); else idle(m2);
          return;
        }
        var md = m2.getModel();
        for (var k = 0; k < curMotion.curves.length; k++) {
          var c = curMotion.curves[k];
          md.setParameterValueByIndex(c.i, valueAt(c.s, t));
        }
      }, 33);
    });
  }

  function pickIndex(m, group, wantClick) {
    var st = m._modelSetting;
    var n = st.getMotionCount(group);
    if (!n) return -1;
    var all = [];
    var clicks = [];
    for (var i = 0; i < n; i++) {
      all.push(i);
      var f = st.getMotionFileName(group, i) || "";
      if (f.indexOf("Click") >= 0) clicks.push(i);
    }
    var pool = (wantClick && clicks.length) ? clicks : all;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function idle(m) {
    var i = pickIndex(m, "Idle", false);
    if (i >= 0) play(m, "Idle", i, null);
  }

  function tap(m) {
    debug.taps++;
    var i = pickIndex(m, "TapBody", true);
    if (i >= 0) play(m, "TapBody", i, function (mm) { idle(mm); });
    else idle(m);
  }

  window.__l2dTap = function () { var m = window.__l2dModel; if (m) tap(m); };

  function killEngineMotions(model) {
    if (!model || model.__motionsKilled) return;
    model.__motionsKilled = true;
    model.startMotion = function () { return null; };
    model.startRandomMotion = function () { return null; };
  }

  /* 点击：挂在 document 上，用 canvas 矩形判断，避免 canvas 被重建后丢监听 */
  document.addEventListener("click", function (e) {
    var m = window.__l2dModel;
    var c = document.getElementById("live2d");
    if (!m || !c) return;
    var r = c.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right) return;
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    tap(m);
  }, true);

  var lastModel = null;
  var lastId = null;

  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;

    killEngineMotions(m);

    var c = m.getModel();
    if (!c || typeof c.setPartOpacityByIndex !== "function") return;

    var id = localStorage.getItem("modelId") || "0";
    if (m === lastModel && id === lastId) return;

    var list = HIDE[String(c.getPartCount())];
    if (list) {
      for (var i = 0; i < list.length; i++) c.setPartOpacityByIndex(list[i], 0);
    }

    var canvas = document.getElementById("live2d");
    var f = FRAME[id] || { scale: 1, bottom: 0 };
    if (canvas) {
      canvas.style.transformOrigin = "50% 100%";
      canvas.style.transform = "scale(" + f.scale + ")";
      canvas.style.bottom = f.bottom + "px";
    }

    lastModel = m;
    lastId = id;
    setTimeout(function () { idle(m); }, 300);
  }, 400);
})();