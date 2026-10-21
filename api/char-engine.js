/* 干净的引擎内动作修复：把动作预加载进自己的 Map，startMotion 同步命中缓存 */
(function () {
  "use strict";

  var HIDE = {
    "92":  [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36],
    "108": [2, 4, 5, 6, 9, 10, 11, 12, 13, 21]
  };
  var FRAME = { "0": { scale: 1.45, bottom: -55 }, "1": { scale: 1.70, bottom: -95 } };

  var store = new Map();     // group_index -> motion
  var loading = false;

  function preload(model) {
    if (loading || model.__preloaded) return;
    model.__preloaded = true;
    loading = true;

    var st = model._modelSetting;
    var groups = ["Idle", "TapBody"];
    var jobs = [];
    groups.forEach(function (g) {
      var n = st.getMotionCount(g);
      for (var i = 0; i < n; i++) {
        (function (group, index) {
          var key = group + "_" + index;
          if (store.has(key)) return;
          var url = (model._modelHomeDir || "") + st.getMotionFileName(group, index);
          jobs.push(fetch(url)
            .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
            .then(function (buf) {
              if (!buf) return;
              var mot = model.loadMotion(buf, buf.byteLength, null, null, null,
                st, group, index, model._motionConsistency);
              if (mot) {
                mot.setEffectIds(model._eyeBlinkIds, model._lipSyncIds);
                store.set(key, mot);
              }
            })
            .catch(function () {}));
        })(g, i);
      }
    });
    Promise.all(jobs).then(function () { loading = false; });
  }

  function patchStart(model) {
    if (model.__startPatched) return;
    model.__startPatched = true;
    model.startMotion = function (group, index, priority, onFinished, onBegan) {
      try {
        var mot = store.get(group + "_" + index);
        if (!mot) return null;
        mot.setBeganMotionHandler(onBegan);
        mot.setFinishedMotionHandler(onFinished);
        return model._motionManager.startMotionPriority(mot, false, priority);
      } catch (e) {
        return null;
      }
    };
  }

  var lastModel = null;
  var lastId = null;

  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;

    preload(m);
    patchStart(m);

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
  }, 400);

  /* 待机驱动：没有动作在播时，从缓存里同步启动一个 Idle */
  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || !m.__startPatched) return;
    try {
      if (m._motionManager._currentPriority === 0 && store.size > 0) {
        var n = m._modelSetting.getMotionCount("Idle");
        if (n > 0) m.startMotion("Idle", Math.floor(Math.random() * n), 1, null, null);
      }
    } catch (e) { /* ignore */ }
  }, 1200);
})();