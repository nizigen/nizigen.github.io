// live2d_path 参数建议使用绝对路径
const live2d_path = "https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.7/dist/";

// 封装异步加载资源的方法
function loadExternalResource (url, type) {
  return new Promise((resolve, reject) => {
    let tag;

    if (type === "css") {
      tag = document.createElement("link");
      tag.rel = "stylesheet";
      tag.href = url;
    }
    else if (type === "js") {
      tag = document.createElement("script");
      tag.type = 'module';
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

// 加载 waifu.css 和 waifu-tips.js
(async () => {
  // 备用CDN列表，如果主CDN无法访问会自动尝试备用CDN
  const cdnList = [
    "https://fastly.jsdelivr.net/gh/nizigen/live2d_api@v1.4/",
    "https://cdn.jsdelivr.net/gh/nizigen/live2d_api@v1.4/",
    "https://raw.githubusercontent.com/nizigen/live2d_api/v1.4/",
    "https://gcore.jsdelivr.net/gh/nizigen/live2d_api@v1.4/"
  ];

  let currentCdnIndex = 0;
  let loadSuccess = false;

  // 尝试加载资源的函数，支持本地优先+CDN回退
  async function tryLoadResources (cdnUrl) {
    try {
      // 优先尝试加载本地CSS
      let cssPromise;
      try {
        cssPromise = loadExternalResource("/waifu.css", "css");
        console.log("尝试加载本地CSS: /waifu.css");
      } catch (localError) {
        console.warn("本地CSS加载失败，使用CDN:", localError);
        cssPromise = loadExternalResource(cdnUrl + "waifu.css", "css");
      }

      await Promise.all([
        cssPromise,
        loadExternalResource(cdnUrl + "waifu-tips.js", "js")
      ]);
      loadSuccess = true;
      return cdnUrl;
    } catch (error) {
      console.warn(`CDN ${cdnUrl} 加载失败，尝试下一个...`);
      return null;
    }
  }

  // 尝试所有CDN直到成功或全部失败
  while (!loadSuccess && currentCdnIndex < cdnList.length) {
    const result = await tryLoadResources(cdnList[currentCdnIndex]);
    if (result) {
      console.log(`成功使用CDN: ${result}`);
      break;
    }
    currentCdnIndex++;
  }

  if (!loadSuccess) {
    console.error("所有CDN都无法访问，Live2D功能将被禁用");
    return;
  }

  const workingCdn = cdnList[currentCdnIndex];

  // 配置选项的具体用法见 README.md
  try {
    console.log("初始化Live2D Widget...");
    console.log("工作CDN:", workingCdn);
    console.log("waifu-tips.json路径:", workingCdn + "waifu-tips.json");

    initWidget({
      waifuPath: workingCdn + "waifu-tips.json",
      cdnPath: workingCdn,
      cubism2Path: live2d_path + "live2d.min.js",
      cubism5Path: "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
      tools: ["hitokoto", "asteroids", "switch-model", "switch-texture", "photo", "info", "quit"],
      logLevel: "info", // 改为info级别以获得更多调试信息
      drag: false
    });

    console.log("Live2D Widget初始化完成");

    // 添加必要的CSS样式确保Live2D正确显示
    const style = document.createElement('style');
    style.textContent = `
      #waifu.waifu-active {
        bottom: 0 !important;
        transform: translateY(0) !important;
      }
      #waifu.waifu-hidden {
        bottom: -1000px !important;
      }
      #live2d {
        display: block !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      #waifu-tool {
        display: block !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      #waifu-tips {
        display: block !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);

    // 清除可能导致问题的缓存
    localStorage.removeItem("modelId");
    localStorage.removeItem("modelTexturesId");
  } catch (error) {
    console.error("Live2D初始化失败:", error);
    console.warn("建议检查网络连接或更换CDN源");
  }

  // 添加全局错误处理，防止Live2D错误导致页面崩溃
  window.addEventListener('error', (event) => {
    // 处理Live2D相关的错误
    if (event.message && event.message.includes('hitTest')) {
      console.warn("Live2D hitTest错误，已自动修复:", event.message);
      event.preventDefault(); // 阻止错误传播
      return false;
    }

    // 处理资源加载错误
    if (event.filename && (event.filename.includes('live2d') || event.filename.includes('textures.cache'))) {
      console.warn("Live2D资源加载错误，已自动处理:", event.message);
      event.preventDefault();
      return false;
    }
  });

  // 添加额外的检查和调试信息
  setTimeout(() => {
    const waifuElement = document.getElementById('waifu');
    const live2dCanvas = document.getElementById('live2d');

    console.log("Live2D元素检查:");
    console.log("- waifu元素存在:", !!waifuElement);
    console.log("- live2d画布存在:", !!live2dCanvas);

    if (waifuElement) {
      console.log("- waifu类名:", waifuElement.className);
      console.log("- waifu样式:", getComputedStyle(waifuElement).bottom);
    }

    if (live2dCanvas) {
      console.log("- 画布尺寸:", live2dCanvas.width, "x", live2dCanvas.height);
      console.log("- 画布样式:", getComputedStyle(live2dCanvas).display, getComputedStyle(live2dCanvas).visibility);
    }

    // 如果画布存在但不可见，强制显示
    if (live2dCanvas && getComputedStyle(live2dCanvas).display === 'none') {
      console.log("强制显示Live2D画布");
      live2dCanvas.style.display = 'block';
      live2dCanvas.style.visibility = 'visible';
    }

    // 如果waifu元素存在但没有active类，添加它
    if (waifuElement && !waifuElement.classList.contains('waifu-active')) {
      console.log("添加waifu-active类");
      waifuElement.classList.add('waifu-active');
    }

    // 如果Live2D加载失败，尝试降级方案
    if (!live2dCanvas || live2dCanvas.width === 0) {
      console.warn("Live2D模型加载失败，尝试降级显示");
      // 可以在这里添加降级的静态图片显示
    }
  }, 3000);
})();

console.log(`
  く__,.ヘヽ.        /  ,ー､ 〉
           ＼ ', !-─‐-i  /  /´
           ／｀ｰ'       L/／｀ヽ､
         /   ／,   /|   ,   ,       ',
       ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
        ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
          !,/7 '0'     ´0iソ|    |
          |.从"    _     ,,,, / |./    |
          ﾚ'| i＞.､,,__  _,.イ /   .i   |
            ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
              | |/i 〈|/   i  ,.ﾍ |  i  |
             .|/ /  ｉ：    ﾍ!    ＼  |
              kヽ>､ﾊ    _,.ﾍ､    /､!
              !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
              ﾚ'ヽL__|___i,___,ンﾚ|ノ
                  ﾄ-,/  |___./
                  'ｰ'    !_,.:
`);
