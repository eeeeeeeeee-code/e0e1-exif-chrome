if (chrome.runtime.onInstalled != null) {
    chrome.runtime.onInstalled.addListener(() => {
        createContextMenu();
    });
}


if (chrome.runtime.onStartup != null) {
    chrome.runtime.onStartup.addListener(() => {
        createContextMenu();
    });
}

function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "exifInspector",
            title: "检查图片 EXIF",
            contexts: ["image"]
        });
    });
}


// 监听右键菜单点击事件
if (chrome?.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (!info?.srcUrl) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: fetchExifData,
            args: [info.srcUrl]
        }).catch(() => {});
    });
}


function fetchExifData(imageUrl) {
    fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
            return new Promise((resolve, reject) => {
                let reader = new FileReader();
                reader.onload = function (e) {
                    let arrayBuffer = e.target.result;
                    let exifData = EXIF.readFromBinaryFile(arrayBuffer);
                    resolve(exifData);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });
        })
        .then(exifData => {
            if (!exifData || Object.keys(exifData).length === 0) {
                showPopup("❌ 未检测到什么有效 EXIF 信息！");
                return;
            }

            // **提取特定的参数并汉化**
            let translatedExif = {
                "📷 拍摄机型": exifData.Model || "未知",
                "🏭 生产厂家": exifData.Make || "未知",
                "📅 拍摄时间": exifData.DateTime || "未知",
                "⏳ 曝光时间": exifData.ExposureTime ? `${exifData.ExposureTime}s` : "未知",
                "🔆 光圈": exifData.FNumber ? `f/${exifData.FNumber}` : "未知",
                "🎞 ISO": exifData.ISOSpeedRatings || "未知",
                "🔍 焦距": exifData.FocalLength ? `${exifData.FocalLength}mm` : "未知",
                "🗺 GPS 纬度": exifData.GPSLatitude ? formatGPS(exifData.GPSLatitude, exifData.GPSLatitudeRef) : "未知",
                "🗺 GPS 经度": exifData.GPSLongitude ? formatGPS(exifData.GPSLongitude, exifData.GPSLongitudeRef) : "未知",
                "📍 GPS 海拔": exifData.GPSAltitude ? `${exifData.GPSAltitude}m` : "未知",
                "🕰 GPS 时间": exifData.GPSTimeStamp ? exifData.GPSTimeStamp.join(":") : "未知",
                "📜 MIME 类型": exifData.MimeType || "未知"
            };

            let outputText = Object.entries(translatedExif)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n");

            // **居中弹窗**
            showPopup(outputText);
        })
        .catch(() => {
            showPopup("❌ 无法读取 EXIF 信息，请检查图片格式！");
        });
}

// ✅ 格式化 GPS 坐标
function formatGPS(coord, ref) {
    if (!coord || coord.length !== 3) return "未知";
    let degrees = coord[0];
    let minutes = coord[1];
    let seconds = coord[2];
    return `${degrees}° ${minutes}' ${seconds}" ${ref || ""}`;
}

function showPopup(message) {
    let existingPopup = document.getElementById("exif-popup");
    if (existingPopup) {
        existingPopup.remove();
    }

    let popup = document.createElement("div");
    popup.id = "exif-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
    popup.style.color = "white";
    popup.style.padding = "15px";
    popup.style.borderRadius = "8px";
    popup.style.fontSize = "14px";
    popup.style.zIndex = "99999";
    popup.style.whiteSpace = "pre-line";
    popup.style.maxWidth = "400px";
    popup.style.textAlign = "left";
    popup.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)";

    let closeButton = document.createElement("button");
    closeButton.innerText = "❌ 关闭";
    closeButton.style.display = "block";
    closeButton.style.marginTop = "10px";
    closeButton.style.padding = "5px 10px";
    closeButton.style.border = "none";
    closeButton.style.backgroundColor = "#ff5555";
    closeButton.style.color = "white";
    closeButton.style.borderRadius = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = () => popup.remove();

    popup.innerText = message;
    popup.appendChild(closeButton);
    document.body.appendChild(popup);
}
