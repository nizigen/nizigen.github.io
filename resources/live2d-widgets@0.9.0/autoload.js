// 看板娘：所有资源都在本站 /api/ 下（模型 33MB，走 jsDelivr 会超时/被墙）
const BASE = "/api/";

function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;
    if (type === "css") {
      tag = document.createElement("link");
      tag.rel = "stylesheet";
      tag.href = url;
    } else if (type === "js") {
      tag = document.createElement("script");
      tag.type = "module";
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}

// 避免跨域图片资源问题
const OriginalImage = window.Image;
window.Image = function (...args) {
  const img = new OriginalImage(...args);
  img.crossOrigin = "anonymous";
  return img;
};
window.Image.prototype = OriginalImage.prototype;

(async () => {
  try {
    await Promise.all([
      loadExternalResource("/waifu.css", "css"),
      loadExternalResource(BASE + "waifu-tips.js", "js")
    ]);

    initWidget({
      waifuPath: BASE + "waifu-tips.json",
      cdnPath: BASE,
      cubism2Path: "https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.7/dist/live2d.min.js",
      cubism5Path: "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
      tools: ["hitokoto", "asteroids", "switch-model", "switch-texture", "photo", "info", "quit"],
      logLevel: "info",
      drag: false
    });

    // 只显示人物：按 part 下标隐藏场景（沙发保留），并按模型缩放
    await loadExternalResource(BASE + "char-engine.js?v=1", "js").catch(() => {});

    // 确保气泡、工具栏可见（主题里可能有裁剪）
    const style = document.createElement("style");
    style.textContent = `
      #waifu.waifu-active { bottom: 0 !important; transform: translateY(0) !important; }
      #waifu.waifu-hidden { bottom: -1000px !important; }
      #live2d { display: block !important; visibility: visible !important; pointer-events: auto !important; }
      #waifu-tool { display: block !important; opacity: .9 !important; pointer-events: auto !important; }
      #waifu-tips { display: block !important; pointer-events: auto !important; }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.error("Live2D 加载失败", e);
  }
})();
