/* 只显示人物 + 动作单次加载（修复原播放器动作缓存的 bug） */
(function () {
  "use strict";

  var HIDE = {
    "92":  [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36],   // Shalom_3：黑石英/中景光晕/背景板/花丛/藤蔓/唱片机/烛台/桌/窗帘/立牌/雕像
    "108": [2, 4, 5, 6, 9, 10, 11, 12, 13, 21]                  // Shalom_4：天空/背景/雨/海浪/棱锥/蒙版
  };

  // 每个模型的人物缩放（隐藏场景后模型会重排，需要各自补偿）
  var FRAME = { "0": { scale: 1.45, bottom: -55 }, "1": { scale: 1.70, bottom: -95 } };

  /*
   * 原播放器的 startMotion 有两处问题：
   *   1) 它的 _motions 用对象比较查 key，getValue("Idle_0") 永远 miss；
   *   2) fetch 是异步的，但它在 fetch 返回前就 `if(!o) return`，所以首次必定失败。
   * 结果：每帧重试 → 每帧下载动作文件。
   * 这里换成自己的 Map 缓存：每次动作只下载一次，解析成功后直接 startMotionPriority。
   */
  var cache = new Map();    // group_index -> motion
  var pending = new Set();  // group_index

  function patchMotions(model) {
    if (!model || model.__moPatched) return;
    model.__moPatched = true;

    model.startMotion = function (group, index, priority, onFinished, onBegan) {
      try {
        var st = model._modelSetting;
        var mm = model._motionManager;
        if (!st || !mm || st.getMotionCount(group) === 0) return null;

        var key = group + "_" + index;
        var hit = cache.get(key);
        if (hit) {
          hit.setBeganMotionHandler(onBegan);
          hit.setFinishedMotionHandler(onFinished);
          return mm.startMotionPriority(hit, false, priority);
        }

        mm.setReservePriority(priority);
        if (pending.has(key)) return null;
        pending.add(key);

        var file = st.getMotionFileName(group, index);
        fetch((model._modelHomeDir || "") + file)
          .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
          .then(function (buf) {
            pending.delete(key);
            if (!buf) { mm.setReservePriority(0); return; }
            var mot = model.loadMotion(
              buf, buf.byteLength, null, onFinished, onBegan,
              st, group, index, model._motionConsistency
            );
            if (!mot) { mm.setReservePriority(0); return; }
            mot.setEffectIds(model._eyeBlinkIds, model._lipSyncIds);
            cache.set(key, mot);
            mm.startMotionPriority(mot, true, priority);
          })
          .catch(function () {
            pending.delete(key);
            mm.setReservePriority(0);
          });
      } catch (e) {
        /* ignore */
      }
      return null;
    };
  }

  var lastModel = null;
  var lastId = null;

  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;

    patchMotions(m);

    var c = m.getModel();
    if (!c || typeof c.setPartOpacityByIndex !== "function") return;

    var id = localStorage.getItem("modelId") || "0";
    if (m === lastModel && id === lastId) return;

    var list = HIDE[String(c.getPartCount())];
    if (!list) return;
    for (var i = 0; i < list.length; i++) c.setPartOpacityByIndex(list[i], 0);

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
})();
