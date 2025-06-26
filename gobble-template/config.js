// // config.js
// (async () => {
//     try {
//         const api_url = "https://cscartdemotest.webkul.in/multi188/index.php?dispatch=wk_erp_saved.get_config";
//         const response = await fetch(api_url);
//         const config = await response.json();

//         if (config.success) {
//             chrome.storage.local.set({ remoteConfig: config.data }, () => {
//                 console.log("Remote config saved:", config.data);
//             });
//         } else {
//             console.warn("Remote config fetch failed:", config.message);
//         }
//     } catch (error) {
//         console.error("Error fetching remote config:", error);
//     }
// })();
