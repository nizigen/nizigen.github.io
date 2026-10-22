/* 只显示人物 + 自建动作播放器（按 moc3 的参数顺序解析下标）
 * - 模型名统一由 model_list.json 的下标解析，所有缓存/状态按模型隔离
 * - 每个模型的隐藏 part、缩放、下移来自该模型目录下的 motions.json（与 build-model3.py 同源）
 * - 画布先隐藏，part 藏好、画面出第一帧再淡入，避免开场闪黑底/场景 */
(function () {
  "use strict";

  var BASE = "/api/";
  var KIND = "5732";

  /* motions.json 读不到时的兜底（下标＝moc3 里的 part 序号） */
  var FALLBACK = {
    "0": { hide: [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36], draws: [], scale: 1.14, bottom: 0 }, // Shalom_3
    "1": { hide: [2, 4, 5, 6, 9, 10, 11, 12, 13, 21], draws: [], scale: 1.26, bottom: 0 },              // Shalom_4
    "2": { hide: [2, 6, 26], draws: [], scale: 1.25, bottom: 0 },                                       // Angel_5
    "3": { hide: [2, 4, 6, 7, 8, 11, 12], draws: [], scale: 1.01, bottom: 0 },                          // Coquelicot_3
    "4": { hide: [3, 4, 5, 6, 7, 9, 10, 11], draws: [251, 252], scale: 0.97, bottom: 0 },                // Duruo_3
    "5": { hide: [1, 3, 4, 5, 7, 9], draws: [], scale: 1.25, bottom: 0 }                                // Eleven_3
  };

  var qs = new URLSearchParams(location.search);
  var qHide = qs.get("hide");
  var qRaw = qs.get("raw");
  var CFG_VER = "16"; // 与 autoload.js 里的 char-player.js?v= 保持一致

  /* ---------- 模型名解析 ---------- */
  var models = null, modelsLoading = null;
  function loadModels() {
    if (models) return Promise.resolve(models);
    if (modelsLoading) return modelsLoading;
    modelsLoading = fetch(BASE + "model_list.json")
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = (j && j.models) || j || [];
        models = list.map(function (p) { return String(p).split("/").pop(); });
        return models;
      })
      .catch(function () {
        models = ["Shalom_3", "Shalom_4", "Angel_5", "Coquelicot_3", "Duruo_3", "Eleven_3"];
        return models;
      });
    return modelsLoading;
  }
  function currentId() { return String(localStorage.getItem("modelId") || "0"); }
  function nameOf(id) { return models ? (models[Number(id)] || models[0]) : null; }

  /* ---------- 每模型配置（motions.json） ---------- */
  var modelCfg = {}, modelCfgLoading = {};
  function loadModelCfg(name) {
    if (modelCfg[name]) return Promise.resolve(modelCfg[name]);
    if (modelCfgLoading[name]) return modelCfgLoading[name];
    // 带 v: 版本号，避免浏览器/边缘缓存拿到旧配置（draws/hide 改了要生效）
    modelCfgLoading[name] = fetch(BASE + "model/" + KIND + "/" + name + "/motions.json?v=" + CFG_VER)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        modelCfg[name] = {
          hide: (j && j.hide) || [],
          draws: (j && j.draws) || [],
          scale: (j && j.scale) || 1,
          bottom: (j && j.bottom) || 0
        };
        return modelCfg[name];
      })
      .catch(function () { modelCfg[name] = { hide: [], draws: [], scale: 1, bottom: 0 }; return modelCfg[name]; });
    return modelCfgLoading[name];
  }

  /* ---------- 状态 ---------- */
  var paramMaps = {};       // name -> { paramId: index }
  var curveCache = {};      // name + "|" + file -> motion 数据
  var playback = { cur: null, t0: 0, from: {}, name: null };
  var timer = null;
  var debug = { motion: null, taps: 0, plays: 0, curves: 0 };
  window.__l2dPlayback = playback;
  window.__l2dDebug = debug;

  /* ---------- motion3 曲线求值（线性 / 贝塞尔 / 阶梯） ---------- */
  function valueAt(s, t) {
    if (t <= s[0]) return s[1];
    var i = 2, pt = s[0], pv = s[1];
    while (i < s.length) {
      var ty = s[i];
      if (ty === 0 || ty === 2 || ty === 3) {
        var nt = s[i + 1], nv = s[i + 2];
        if (t <= nt) {
          if (ty === 2) return pv;
          var r = (t - pt) / ((nt - pt) || 1);
          return pv + (nv - pv) * r;
        }
        pt = nt; pv = nv; i += 3;
      } else if (ty === 1) {
        var c1x = s[i + 1], c1y = s[i + 2], c2x = s[i + 3], c2y = s[i + 4];
        var et = s[i + 5], ev = s[i + 6];
        if (t <= et) {
          var x = (t - pt) / ((et - pt) || 1);
          var lo = 0, hi = 1, u = x;
          for (var k = 0; k < 20; k++) {
            u = (lo + hi) / 2;
            var mu = 1 - u;
            var bx = 3 * mu * mu * u * c1x + 3 * mu * u * u * c2x + u * u * u;
            if (bx < x) lo = u; else hi = u;
          }
          var mu2 = 1 - u;
          var by = 3 * mu2 * mu2 * u * c1y + 3 * mu2 * u * u * c2y + u * u * u;
          return pv + (ev - pv) * by;
        }
        pt = et; pv = ev; i += 7;
      } else {
        break;
      }
    }
    return pv;
  }

  /* ---------- 每帧钩子 ---------- */
  function installHook(m) {
    var md = m.getModel();
    if (!md || md.__hooked) return;
    md.__hooked = true;
    var orig = md.update.bind(md);
    md.update = function () {
      var hl = window.__hideList || [];
      for (var hi = 0; hi < hl.length; hi++) md.setPartOpacityByIndex(hl[hi], 0);
      var p = playback;
      if (p.cur) {
        var el = performance.now() - p.t0;
        var t = el / 1000;
        if (p.cur.loop && p.cur.dur > 0) t = t % p.cur.dur;
        var k = Math.min(1, el / 400);
        for (var i = 0; i < p.cur.curves.length; i++) {
          var cv = p.cur.curves[i];
          var v = valueAt(cv.s, t);
          if (k < 1 && p.from[cv.i] !== undefined) v = p.from[cv.i] + (v - p.from[cv.i]) * k;
          md.setParameterValueByIndex(cv.i, v);
        }
      }
      var r = orig();
      /* drawable 级隐藏：必须在 update 之后写，否则会被 csmUpdateModel 覆盖 */
      var dl = window.__hideDrawables || [];
      if (dl.length) {
        var dd = md._model && md._model.drawables;
        if (dd && dd.opacities) {
          for (var di = 0; di < dl.length; di++) dd.opacities[dl[di]] = 0;
        }
      }
      if (window.__l2dArmed && !wantVisible) reveal();
      return r;
    };
  }

  /* ---------- 先藏画布，配置生效、出第一帧后再显示 ---------- */
  var wantVisible = false;
  function setVis(v) {
    var c = document.getElementById("live2d");
    if (!c) return;
    c.style.transition = "opacity .3s";
    c.style.visibility = v ? "visible" : "hidden";
    c.style.opacity = v ? "1" : "0";
  }
  function conceal() { wantVisible = false; setVis(false); }
  function reveal() { wantVisible = true; setVis(true); }
  /* 幂等看门狗：只要想显示就保证显示，避免某次时机不对就一直藏着 */
  setInterval(function () { if (wantVisible) setVis(true); }, 200);

  /* ---------- 参数顺序表 & 动作加载 ---------- */
  function ensureParams(name) {
    if (paramMaps[name]) return Promise.resolve(paramMaps[name]);
    return fetch(BASE + "model/" + KIND + "/" + name + "/params.json")
      .then(function (r) { return r.json(); })
      .then(function (ids) {
        var map = {};
        for (var i = 0; i < ids.length; i++) map[ids[i]] = i;
        paramMaps[name] = map;
        return map;
      })
      .catch(function () { return null; });
  }

  function loadMotion(name, file) {
    var key = name + "|" + file;
    if (curveCache[key]) return Promise.resolve(curveCache[key]);
    return ensureParams(name).then(function (map) {
      if (!map) return null;
      return fetch(BASE + "model/" + KIND + "/" + name + "/" + String(file).replace(/^\/+/, ""))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var curves = [];
          j.Curves.forEach(function (c) {
            if (c.Target !== "Parameter") return;
            var i = map[c.Id];
            if (i === undefined) return;
            curves.push({ i: i, s: c.Segments });
          });
          var data = { curves: curves, dur: j.Meta.Duration || 4, loop: !!j.Meta.Loop };
          curveCache[key] = data;
          return data;
        })
        .catch(function () { return null; });
    });
  }

  function play(m, file, onEnd) {
    var name = nameOf(currentId());
    if (!name) return;
    loadMotion(name, file).then(function (data) {
      if (!data || !data.curves.length) {
        if (onEnd) setTimeout(function () { onEnd(m); }, 200);
        return;
      }
      start(m, data, name, file, onEnd);
    });
  }

  function start(m, data, name, file, onEnd) {
    installHook(m);
    var md0 = m.getModel();
    var from = {};
    for (var i = 0; i < data.curves.length; i++) {
      var ci = data.curves[i].i;
      try { from[ci] = md0.getParameterValueByIndex(ci); } catch (e) {}
    }
    playback.from = from;
    playback.cur = data;
    playback.name = name;
    playback.t0 = performance.now();
    debug.motion = file; debug.plays++; debug.curves = data.curves.length;

    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      var m2 = window.__l2dModel;
      if (!m2 || playback.cur !== data) return;
      if (!data.loop && (performance.now() - playback.t0) / 1000 >= data.dur) {
        clearInterval(timer); timer = null;
        if (onEnd) onEnd(m2); else idle(m2);
      }
    }, 120);
  }

  /* 进场/场景类动作：藏掉背景后很出戏，直接不播 */
  var SKIP = /(background|level|drag_end|dragend|interactivearea)/i;

  function motionFiles(m, group) {
    var st = m._modelSetting, out = [];
    if (!st || typeof st.getMotionCount !== "function") return out;
    var n = st.getMotionCount(group);
    for (var i = 0; i < n; i++) {
      var f = st.getMotionFileName(group, i);
      if (!f || SKIP.test(f)) continue;
      out.push(f);
    }
    return out;
  }

  /* 待机：只循环最轻的那一条（Idle），不再把 Boring / Click_xxx / Greet 当待机轮播 */
  function idle(m) {
    var files = motionFiles(m, "Idle");
    if (!files.length) return;
    var exact = files.filter(function (f) { return /\/Idle\.motion3\.json$/i.test(f); });
    play(m, exact.length ? exact[0] : files[0], null);
  }

  /* 点击：只播 Click_* */
  function tap(m) {
    debug.taps++;
    var files = motionFiles(m, "TapBody").filter(function (f) { return /click/i.test(f); });
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

  /* ---------- 主循环 ---------- */
  var lastModel = null, lastId = null;

  function applyFrame(cfg, c) {
    var hideList = qRaw ? [] : (qHide ? qHide.split(",").map(Number) : (cfg.hide || []));
    for (var i = 0; i < hideList.length; i++) {
      if (c.getPartCount && hideList[i] >= c.getPartCount()) continue;
      c.setPartOpacityByIndex(hideList[i], 0);
    }
    window.__hideList = hideList;
    var qDraws = qs.get("draws");
    window.__hideDrawables = qRaw ? [] : (qDraws ? qDraws.split(",").map(Number) : (cfg.draws || []));
    var canvas = document.getElementById("live2d");
    if (canvas) {
      canvas.style.transformOrigin = "50% 100%";
      canvas.style.transform = "scale(" + (cfg.scale || 1) + ")";
      canvas.style.bottom = (cfg.bottom || 0) + "px";
    }
  }

  function tick() {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;
    killEngineMotions(m);
    var c = m.getModel();
    if (!c || typeof c.setPartOpacityByIndex !== "function") return;

    var id = currentId();
    if (m === lastModel && id === lastId) { installHook(m); return; }

    var name = nameOf(id);
    if (!name) { loadModels(); return; }

    lastModel = m; lastId = id;
    window.__l2dArmed = false;
    window.__l2dReady = false;
    conceal();
    setTimeout(reveal, 4000);
    if (timer) { clearInterval(timer); timer = null; }
    playback.cur = null; playback.from = {};

    loadModelCfg(name).then(function (cfg) {
      if (window.__l2dModel !== m) return;
      if (!cfg.hide || !cfg.hide.length) {
        var fb = FALLBACK[id];
        if (fb) cfg = fb;
      }
      applyFrame(cfg, c);
      installHook(m);
      window.__l2dArmed = true;
      setTimeout(reveal, 150);
      setTimeout(function () {
        if (window.__l2dModel === m && currentId() === id) idle(m);
      }, 60);
    });
  }

  loadModels();
  /* 兜底：配置异常时 4 秒后也要把画布显示出来 */
  setTimeout(function () { window.__l2dArmed = true; reveal(); }, 4000);
  (function loop() {
    try { tick(); } catch (e) {}
    setTimeout(loop, 60);
  })();
})();
