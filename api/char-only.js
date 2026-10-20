/* 只显示人物：按 part 下标隐藏场景层（Shalom_3 保留沙发，她是坐姿） */
(function () {
  "use strict";

  var HIDE = {
    "92":  [5, 6, 8, 9, 10, 11, 12, 28, 31, 32, 34, 35, 36],   // Shalom_3：黑石英/中景光晕/背景板/花丛/藤蔓/唱片机/烛台/桌/窗帘/立牌/雕像
    "108": [2, 4, 5, 6, 9, 10, 11, 12, 13, 21]        // Shalom_4：天空/背景/雨/海浪/棱锥/蒙版
  };

  // 每个模型的人物缩放（隐藏场景后模型会重排，需要各自补偿）
  var FRAME = { "0": { scale: 1.45, bottom: -55 }, "1": { scale: 1.70, bottom: -95 } };


  /* 停止动作轮询：这个运行时里 motion3 无法被正常创建，会导致每帧重试下载
     （数千次请求）。先关掉，保证只加载一次、不耗流量。 */
  function stopMotion(model) {
    if (!model || model.__motionStopped) return;
    model.__motionStopped = true;
    model.startMotion = function () { return null; };
    model.startRandomMotion = function () { return null; };
  }

  var lastModel = null;
  var lastId = null;

  setInterval(function () {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return;
    stopMotion(m);
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
