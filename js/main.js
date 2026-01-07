import { initShortcuts } from "./shortcuts.js";


  // ------ ロード部 ------ // 
  function showLoading(detailText = "") {
    const overlay = document.getElementById("loading-overlay");
    const detail = document.getElementById("loading-detail");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    if (detail) detail.textContent = detailText;
  }

  function hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
  }

  function setLoadingDetail(text) {
    const detail = document.getElementById("loading-detail");
    if (detail) detail.textContent = text;
  }


  // ------ ビューワートグル機能 ------ // 
    const checkbox = document.getElementById('toggleCheck');
    const targetBox = document.getElementById('genga_OSD');

    checkbox.addEventListener('change', function () {
      targetBox.classList.toggle('filter', this.checked);
    });

    const dougaViewToggle = document.getElementById('toggleDougaView');
    const gengaViewToggle = document.getElementById('toggleGengaView');
    const dougaContainer = document.getElementById('douga_OSD');
    const gengaContainer = document.getElementById('genga_OSD');

    function applyViewVisibility(event) {
        const target = event?.target;  // どちらのチェックボックスが変更されたか
        const isDougaToggle = target === dougaViewToggle;
        const isGengaToggle = target === gengaViewToggle;

        // 通常の表示/非表示処理
        dougaContainer.classList.toggle('hidden', !dougaViewToggle.checked);
        gengaContainer.classList.toggle('hidden', !gengaViewToggle.checked);

        // ------ 両方OFFになってしまった場合の処理 ------
        const dougaHidden = dougaContainer.classList.contains('hidden');
        const gengaHidden = gengaContainer.classList.contains('hidden');

        if (dougaHidden && gengaHidden) {
            if (isDougaToggle) {
                gengaContainer.classList.remove('hidden');
                gengaViewToggle.checked = true;
            } else if (isGengaToggle) {
                dougaContainer.classList.remove('hidden');
                dougaViewToggle.checked = true;
            }
        }
    }

    dougaViewToggle.addEventListener('change', applyViewVisibility);
    gengaViewToggle.addEventListener('change', applyViewVisibility);


    // ------ 変数設定 ------ // 
    let viewer = OpenSeadragon({
      id: "douga_OSD",
      prefixUrl: "../openseadragon/images/", 
      preload:true,
    });
    let genga_viewer = OpenSeadragon({
      id: "genga_OSD",
      prefixUrl: "../openseadragon/images/", 
      preload:true,
    });

    let imageList = [];
    let imageListId =[];
    let imageLabels = [];
    let gengaLabels = [];
    let currentGengaLabel = [];
    let layerOffsets = [];
    let layer_opacity = [];
    let layerToggles = [];
    let timeData = [];
    let currentIndex = 0;
    let autoScroll = false;
    let autoLoopId = null;
    let gengaCount = 0; //原画opacity管理
    let imageIdToIndex = new Map();
    let gengaItemMap = new Map();
    let gengaIdMap = []; // 画像ごとのgenga IDを格納
    let gengaLabelMap =[]

    let secondaryGengaOpacityRatio = 0.6; //修正原画用opacity

    //番号表示用
    let numberDisplay = null;
    let gengaLabelDisplay = null;
    let dougaLabelDisplay = null;
    let layerLabelDisplays = []; // 各レイヤーの表示用DOM

    //TimeSheet
    let timeSheetViewer;
    let timeSheetUrl = ''
    let titleName = ''
    let timeSheetVisible = false; 

    //レイヤーショートカット
    let layerCheckboxes = [];

    //collection用レイヤー名
    let layerNames = [];


    function renderTimelineAll() {
      const wrapper = document.getElementById('timeline-wrapper');

      for (let i = 0; i < layerToggles.length; i++) {
        let block = wrapper.querySelector(`.timeline-layer-block[data-layer-index="${i}"]`);

        if (!block) {
          // 初回だけDOMを構築
          block = document.createElement('div');
          block.className = 'timeline-layer-block';
          block.dataset.layerIndex = i;

          const controlRow = document.createElement('div');
          controlRow.className = 'timeline-header-controls';

          const label = document.createElement('span');
          label.textContent = layerNames?.[i] ?? String.fromCharCode(65 + (layerToggles.length - 1 - i));

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = layerToggles[i];
          checkbox.addEventListener('change', () => {
            layerToggles[i] = checkbox.checked;
            renderTimelineAll();
            moveTimelineMarker(currentIndex);
            showFrame(currentIndex);
          });
          layerCheckboxes[i] = checkbox;

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.min = 0;
          slider.max = 1;
          slider.step = 0.01;
          slider.value = layer_opacity[i];
          slider.style.width = '80px';

          const valueDisplay = document.createElement('span');
          valueDisplay.textContent = ` ${parseFloat(slider.value).toFixed(2)}`;

          slider.addEventListener('input', () => {
            layer_opacity[i] = parseFloat(slider.value);
            valueDisplay.textContent = layer_opacity[i].toFixed(2);
            showFrame(currentIndex);
          });

          controlRow.appendChild(label);
          controlRow.appendChild(document.createTextNode(' 表示'));
          controlRow.appendChild(checkbox);

          const dougaSpan = document.createElement('span');
          dougaSpan.className = 'layer-label-box';
          dougaSpan.textContent = '動画: --------';

          const gengaSpan = document.createElement('span');
          gengaSpan.className = 'layer-label-box';
          gengaSpan.textContent = '原画: --------';

          layerLabelDisplays[i] = { dougaSpan, gengaSpan };

          controlRow.appendChild(dougaSpan);
          controlRow.appendChild(gengaSpan);

          if (i !== 0) {
            controlRow.appendChild(document.createTextNode('原画透過度:'));
            controlRow.appendChild(slider);
            controlRow.appendChild(valueDisplay);
          }

          const container = document.createElement('div');
          container.className = 'timeline-container';
          container.dataset.layerIndex = i;

          const bar = document.createElement('div');
          bar.className = 'timeline-bar';

          const marker = document.createElement('div');
          marker.className = 'timeline-marker';

          container.appendChild(bar);
          container.appendChild(marker);

          block.appendChild(controlRow);
          block.appendChild(container);
          wrapper.prepend(block);
        }

        // 再描画は既存のコンテナに対して
        const container = block.querySelector('.timeline-container');
        renderTimeline(i, container);
      }

      bindTimelineMarkerEvents(); // 一度だけ呼ぶ
    }




    function renderTimeline(num, container) {
      const bar = container.querySelector('.timeline-bar');
      const frameCount = timeData.length;

      if (!bar.timelinePoints || bar.timelinePoints.length !== frameCount) {
        bar.innerHTML = ''; // 初回のみ全削除
        bar.timelinePoints = [];

        for (let i = 0; i < frameCount; i++) {
          const point = document.createElement('div');
          point.className = 'timeline-point';
          bar.appendChild(point);
          bar.timelinePoints.push(point);

          point.addEventListener('click', () => {
            showFrame(i);
          });
        }
      }

      let prevGenga = null;
      let prevIndexInLayer = null;

      for (let i = 0; i < frameCount; i++) {
        const point = bar.timelinePoints[i];
        const frame = timeData[i];
        const indexInLayer = frame[num];

        point.className = 'timeline-point';
        point.style.backgroundColor = 'transparent';

        if (indexInLayer !== prevIndexInLayer && indexInLayer !== 0) {
          point.style.backgroundColor = `#757575`;
        }

        const offset = layerOffsets[num] ?? 0;
        const adjustedIndex = (num > 0 && indexInLayer === 0)
          ? indexInLayer + offset
          : indexInLayer + offset - 1;
        const gengaList = indexInLayer === 0 ? [] : gengaIdMap[adjustedIndex] || [];
        const currentGenga = JSON.stringify(gengaList);
        const hasGenga = gengaList.length > 0 && currentGenga !== prevGenga;

        if (hasGenga) {
          point.classList.add('genga');

          if (layerToggles[num]) {
            point.style.backgroundColor = 'crimson';

            if (gengaList.length >= 2) {
              point.classList.add('genga-multi');
            } else {
              point.classList.remove('genga-multi');
            }
          }
        }

        prevIndexInLayer = indexInLayer;
        prevGenga = currentGenga;

        const positionPercent = (i / (frameCount - 1)) * 100;
        point.style.left = `${positionPercent}%`;
      }
    }

  
  function moveTimelineMarker(index) {
  if (!timeData.length) return;
  const positionPercent = (index / (timeData.length - 1)) * 100;
  document.querySelectorAll('.timeline-marker').forEach(marker => {
    marker.style.left = `${positionPercent}%`;
  });
}

function bindTimelineMarkerEvents() {
  let isDraggingMarker = false;

  document.querySelectorAll('.timeline-marker').forEach(marker => {
    marker.addEventListener('mousedown', (e) => {
      isDraggingMarker = true;
      e.preventDefault();
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDraggingMarker) return;

    const referenceContainer = document.querySelector('.timeline-container');
    const containerRect = referenceContainer.getBoundingClientRect();
    let relativeX = e.clientX - containerRect.left;
    relativeX = Math.max(0, Math.min(containerRect.width, relativeX));
    const percent = (relativeX / containerRect.width) * 100;

    document.querySelectorAll('.timeline-marker').forEach(marker => {
      marker.style.left = `${percent}%`;
    });
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDraggingMarker) return;
    isDraggingMarker = false;

    const referenceContainer = document.querySelector('.timeline-container');
    const containerRect = referenceContainer.getBoundingClientRect();
    let relativeX = e.clientX - containerRect.left;
    const percent = relativeX / containerRect.width;
    const index = Math.round(percent * (timeData.length - 1));

    showFrame(index);
    moveTimelineMarker(index);
  });
}

    function preloadAllGengaImages(callback) {
      const loadedIds = new Set();
      let count = 0;
      let total = gengaIdMap.flat().filter(Boolean).length;
      gengaIdMap.flat().forEach(serviceId => {
        if (!serviceId || loadedIds.has(serviceId)) {
          count+=1;
          return;
        }
        
        loadedIds.add(serviceId);

        genga_viewer.addTiledImage({
          tileSource: `${serviceId}/info.json`,
          opacity: 1.0,
          preload: true,
          success: ({ item }) => {
            const id = item.source['@id'] || item.source.id;
            gengaItemMap.set(id, item);
            setTimeout(() => {
              item.setOpacity(0.0);
            }, 50);
            if (++count === total)callback(); // ✅ 完了時に実行
          }
        });
        
      });
    }

    function preloadAllDougaImages(callback) {
      let count = 0;
      const loadedIds = new Set();
      const total = imageListId.length;
      const revImageListId = [...imageListId].reverse()
      revImageListId.forEach(serviceId => {
        if (!serviceId || loadedIds.has(serviceId)) {
          count++;
          return;
        }

        loadedIds.add(serviceId);

        viewer.addTiledImage({
          tileSource: `${serviceId}/info.json`,
          opacity: 1.0,
          preload: true,
          success: ({ item }) => {
            const id = item.source['@id'] || item.source.id;
            gengaItemMap.set(id, item);
            setTimeout(() => {
              item.setOpacity(0.0);
            }, 100);
            if (++count === total)callback(); // ✅ 完了時に実行
          }
        });
      });
    }



    function extractGengaIdMap(layerOffsets) {
      let prev_gengaIds = [];
      return imageList.map((img, index) => {
        if (layerOffsets.includes(index)) {
          prev_gengaIds = [];
        }
        const gengaList = img?.genga || prev_gengaIds;
        const cleaned = (Array.isArray(gengaList) ? gengaList : [])
          .filter(g => typeof g === "string")
          .map(g => g.replace(/\/info\.json$/, ''));

        prev_gengaIds = cleaned.length > 0 ? cleaned : prev_gengaIds;
        return cleaned;
      });
    }
    function extractGengaLabelMap(layerOffsets) {
      let prev_gengaLabels = "";
      return imageList.map((img, index) => {
        if (layerOffsets.includes(index)) {
          prev_gengaLabels = "";
        }
        const gengaLabelList = img?.gengalabel!="" ? img.gengalabel :prev_gengaLabels ;
        prev_gengaLabels = gengaLabelList;
        return gengaLabelList;
      });
    }



    //読み込み分岐関数
    async function loadIIIF(url) {
      showLoading("IIIFを取得中…");

      try {
        const res = await fetch(url);
        const json = await res.json();

        const type = json.type || json['@type'];

        if (type === 'Manifest') {
          setLoadingDetail("Manifestを解析中…");
          loadManifest(json);

        } else if (type === 'Collection') {
          setLoadingDetail("Collectionを解析中…");
          const materials = await loadCollection(json);
          setLoadingDetail("タイムラインを構築中…");
          const layerFrameMap = attachGengaToDouga(materials);
          console.log(materials,layerFrameMap)
          layerNames = getLayerOrder(layerFrameMap);
          const duration = materials.find(i => i.kind === "カット").duration;
          timeData = createTimeData(layerFrameMap, duration);
          imageList = mergeLayersByReverseOrder(layerFrameMap);
          titleName = materials.find(i => i.kind === "カット")?.Title ?? "";
          timeSheetUrl = materials.find(i => i.kind === "timesheet_back")?.id ?? null;
          
          initializePlaybackContext({ timeData, imageList, titleName, timeSheetUrl });

        } else {
          console.error('Unknown IIIF type:', type);
          hideLoading();
        }

      } catch (e) {
        console.error(e);
        hideLoading();
        alert("読み込みに失敗しました");
      }
    }


    function initializePlaybackContext({
        timeData,
        imageList,
        titleName,
        timeSheetUrl
        }) {
        // --- レイヤーオフセット計算 ---
        const lastFrame = timeData.at(-1);
        layerOffsets = [0];

        for (let i = 1; i < lastFrame.length; i++) {
            if (lastFrame[i - 1] === 0) {
            for (let n = 2; n < timeData.length; n++) {
                const preLastFrame = timeData.at(-n)[i - 1];
                if (preLastFrame !== 0) {
                layerOffsets[i] = layerOffsets[i - 1] + preLastFrame;
                break;
                }
            }
            } else {
            layerOffsets[i] = layerOffsets[i - 1] + lastFrame[i - 1];
            }
        }

        // --- レイヤーUI ---
        layerToggles = Array(timeData[0].length).fill(true);
        layer_opacity = Array(timeData[0].length).fill(0.6);

        renderLayerControls();

        // --- 原画マップ ---
        gengaIdMap = extractGengaIdMap(layerOffsets);
        gengaLabelMap = extractGengaLabelMap(layerOffsets);

        // --- タイムライン ---
        renderTimelineAll();
        bindTimelineMarkerEvents();
        shortcuts?.setupLayerNumberTooltips();
        document.getElementById('show-time-sheet-button').disabled = false;
        closeTimeSheet();

        // --- Image ID ---
        buildImageIdMap();

        // --- タイトル ---
        const title = document.getElementById("title");
        title.innerHTML = '';
        const titleText = document.createElement('span');
        titleText.textContent = `アニメ制作資料再生システム ${titleName}`;
        title.appendChild(titleText);

        // --- プリロード ---
        setLoadingDetail("原画をプリロード中…");
        preloadAllGengaImages(() => {
          setLoadingDetail("動画をプリロード中…");
          preloadAllDougaImages(() => {
            setLoadingDetail("初期表示を準備中…");
            setTimeout(() => {
              reset();
              hideLoading();
            }, 0);
          });
        });

        reset();
    }


    //Manifest読み込み関数
    function loadManifest(manifest) {

        // 全Canvasから画像情報を収集
        imageList = manifest.items.map(canvas => {
            const annotationPage = canvas.items?.[0];
            const annotation = annotationPage?.items?.[0];
            return annotation?.body;
        }).filter(Boolean);

        timeData = manifest.time;

        timeSheetUrl = manifest.TimeSheet;
        titleName = manifest.metadata[0].value +
                    (manifest.metadata[1].value !== "" ? " Ep" + manifest.metadata[1].value : "") +
                    " C" + manifest.metadata[2].value;


        layerNames = Array(timeData[0].length).fill(0).map((_, i) => String.fromCharCode(65 + (timeData[0].length - 1 - i)));
        initializePlaybackContext({timeData,imageList,titleName,timeSheetUrl});
    }

    //仮置きCollection読み込み関数
    async function loadCollection(collection) {
        const manifests = collection.items
            .filter(i => (i.type || i['@type']) === 'Manifest')
            .map(i => i.id);

        const materials = [];

        for (const url of manifests) {
            const res = await fetch(url);
            const manifest = await res.json();

            const meta = normalizeMetadata(manifest.metadata);
            const kind = getMaterialType(meta);
            
            if (!kind) continue;
            if(kind == "カット"){
                const timecode = "00:00:03:12";
                const fps = 24;
                const [hh, mm, ss, ff] = timecode.split(":").map(Number);
                const totalFrames =(hh * 3600 + mm * 60 + ss) * fps + ff;
                materials.push({
                    kind,
                    duration: totalFrames || null,
                    Title: meta['Title'] || null,
                });
            }else if(kind == "timesheet_back"){
                const id = extractImageServiceId(manifest);
                if (!id) continue;

                materials.push({
                    kind,
                    id
                });
            }else if (kind == "timesheet_front"){}
            else if (kind === "genga") {
              const ids = extractGengaServiceIds(manifest);
              if (!ids.length) continue;

              materials.push({
                kind,
                layer: meta['レイヤー'] || null,
                frame: Number(meta['フレーム番号'] || 0),
                label: meta['identifier'] || null,
                ids
              });

            } else {
              const id = extractImageServiceId(manifest);
              if (!id) continue;

              materials.push({
                kind,
                layer: meta['レイヤー'] || null,
                frame: Number(meta['フレーム番号'] || 0),
                label: meta['identifier'] || null,
                id
              });
            }
        }
        return materials;
    }

        function getMaterialType(meta) {
            const type = meta.additionalType;
            if (!type) return null;

            if (type.includes('動画')) return 'douga';
            if (type.includes('原画')) return 'genga';
            if (type.includes('タイムシート_表')) return 'timesheet_front';
            if (type.includes('タイムシート_裏')) return 'timesheet_back';
            if (type.includes('カット'))return 'カット';

            return null;
        }

        function normalizeMetadata(metadata = []) {
            const map = {};
            metadata.forEach(entry => {
                const label = entry.label?.none?.[0];
                const value = entry.value?.none?.[0];
                if (label && value !== undefined) {
                map[label] = value;
                }
            });
            return map;
        }

        function extractImageServiceId(manifest) {
            const canvas = manifest.items?.[0];
            const page = canvas?.items?.[0];
            const anno = page?.items?.[0];
            const body = anno?.body;

            if (!body) return null;

            const service = Array.isArray(body.service)
                ? body.service[0]
                : body.service;

            if (!service?.id) return null;

            return service.id;
        }


        function extractGengaServiceIds(manifest) {
            const ids = [];

            const canvases = manifest.items ?? [];
            for (const canvas of canvases) {
              const page = canvas.items?.[0];
              const anno = page?.items?.[0];
              const body = anno?.body;
              if (!body) continue;

              const services = Array.isArray(body.service)
                ? body.service
                : body.service ? [body.service] : [];

              for (const service of services) {
                if (service?.id) {
                  ids.push(service.id);
                }
              }
          }

          return ids;
        }

    function attachGengaToDouga(data) {
        // 1. genga を layer+frame でまとめる
        const gengaMap = data
            .filter(item => item.kind === "genga")
            .reduce((acc, item) => {
            const key = `${item.layer}_${item.frame}`;
            if (!acc[key]) {
                acc[key] = {
                gengalabel: item.label ?? null,
                genga: []
                };
            }
            if (Array.isArray(item.ids)) {
              acc[key].genga.push(...item.ids);
            }
            return acc;
            }, {});

        // 2. douga を layer 別にまとめて genga を付与
        const dougaByLayer = data
            .filter(item => item.kind === "douga")
            .reduce((acc, item) => {
            const layer = item.layer;
            if (!acc[layer]) acc[layer] = [];

            const key = `${item.layer}_${item.frame}`;
            const gengaInfo = gengaMap[key] || {
                gengalabel: "",
                genga: ""
            };

            acc[layer].push({
                ...item,
                gengalabel: gengaInfo.gengalabel,
                genga: gengaInfo.genga
            });

            return acc;
            }, {});

        // 3. frame 順ソート
        Object.keys(dougaByLayer).forEach(layer => {
            dougaByLayer[layer].sort((a, b) => a.frame - b.frame);
        });

        return dougaByLayer;
    }

    function createTimeData(dougaByLayer, duration) {
        // layer を辞書順逆に
        const layers = getLayerOrder(dougaByLayer);

        // 内部用 index（-1 = 未出現）
        const currentIndex = {};
        layers.forEach(layer => {
            currentIndex[layer] = -1;
        });

        const timeData = [];

        for (let frame = 1; frame <= duration; frame++) {
            const row = [];

            for (const layer of layers) {
            const list = dougaByLayer[layer];

            // frame 以下の douga まで index を進める
            while (
                currentIndex[layer] + 1 < list.length &&
                list[currentIndex[layer] + 1].frame <= frame
            ) {
                currentIndex[layer]++;
            }

            // 現在の douga
            const current =
                currentIndex[layer] >= 0
                ? list[currentIndex[layer]]
                : null;

            // 出力ルール
            if (!current || current.id == null) {
                row.push(0);
            } else {
                row.push(currentIndex[layer] + 1);
            }
            }

            timeData.push(row);
        }

        return timeData;
    }

    function mergeLayersByReverseOrder(dougaByLayer) {
        // layer 名を辞書順逆に
        const layers = getLayerOrder(dougaByLayer);

        // 順番に concat
        const merged = [];

        for (const layer of layers) {
            merged.push(...dougaByLayer[layer]);
        }

        return merged;
    }

    function getLayerOrder(dougaByLayer) {
        return Object.keys(dougaByLayer).sort().reverse();
    }





function buildImageIdMap() {
  imageIdToIndex = new Map();
  imageListId = [];

  imageList.forEach((img, i) => {
    if (img?.id) {
      const cleanId = img.id.replace(/\/full\/.*$/, '');
      imageIdToIndex.set(cleanId, i);
      imageListId.push(cleanId);
    }
  });
}


    function calculateOpacity(isVisible, idx, layerOpacity, secondaryRatio) {
      if (!isVisible) return 0.0;
      return idx === 0 ? layerOpacity : layerOpacity * secondaryRatio;
    }
    
    function setLayerVisibility(serviceId, visible, layer_opacity) {
      // 通常 viewer 側
      const viewerCount = viewer.world.getItemCount();
      for (let i = 0; i < viewerCount; i++) {
        const item = viewer.world.getItemAt(i);
        const id = item.source['@id'] || item.source.id;
        if (id === serviceId) {
          item.setOpacity(visible ? 1.0 : 0.0);
        }
      }

      const imageIndex = imageIdToIndex.get(serviceId);
      if (imageIndex === undefined) return;

      const gengaIds = gengaIdMap[imageIndex];
      if (!Array.isArray(gengaIds)) return;

      gengaIds.forEach((gengaId, idx) => {
        const item = gengaItemMap.get(gengaId);
        if (item) {
          const adjustedOpacity = calculateOpacity(
            visible,
            idx,
            layer_opacity,
            secondaryGengaOpacityRatio
          );
          item.setOpacity(adjustedOpacity);
        }
      });
    }



    function showFrame(frameIndex) {
      if (!timeData[frameIndex]) return;
      gengaCount = 0;
      if(frameIndex == 0){
        currentGengaLabel=[];
      }
      
      
      const currentFrame = timeData[currentIndex];
      currentFrame.forEach((index, i) => {

        const offset = layerOffsets[i] ?? 1;
        const adjusted = (i > 0 && index === 0)
          ? index + offset
          : index + offset - 1;

        const serviceId = imageListId[adjusted];
        const layerOpacity = 0; // 非表示
        if (serviceId) {
          setLayerVisibility(serviceId, false, layerOpacity);
        }
      });

      // 次フレームに対応する画像のみ表示
      const nextFrame = timeData[frameIndex];
      nextFrame.forEach((index, i) => {
        imageLabels[i] = ""; 
        gengaLabels[i] = "";
        if (!layerToggles[i]) return;
        const offset = layerOffsets[i] ?? 1;
        const adjusted = (i > 0 && index === 0)
          ? index + offset
          : index + offset - 1;

        const img = imageList[adjusted];
        const serviceId = imageListId[adjusted];
        const imageLabel = img?.label || "";
        const gengaLabel = gengaLabelMap[adjusted];
        imageLabels[i] = imageLabel;
        gengaLabels[i] = gengaLabel;
        if(nextFrame[i]!=0){
          const layerOpacity = gengaCount === 0 ? 1.0 : layer_opacity[i];
          if (serviceId) {
          setLayerVisibility(serviceId, true, layerOpacity);
          gengaCount++;
        }
        }
      });

      currentIndex = frameIndex;
      moveTimelineMarker(frameIndex);

      //表示用
      if (numberDisplay) {
        numberDisplay.textContent = `フレーム番号: ${currentIndex+1}`;
      }


      for (let i = 0; i < layerToggles.length; i++) {
        if (!layerLabelDisplays[i]) continue;
        const { dougaSpan, gengaSpan } = layerLabelDisplays[i];
        if(frameIndex==0){
          dougaSpan.textContent = `動画: ${'-'}`;
          gengaSpan.textContent = `原画: ${'-'}`;
        }
        if(nextFrame[i]!= 0){
          dougaSpan.textContent = `動画: ${imageLabels[i] || '-'}`;
          gengaSpan.textContent = `原画: ${gengaLabels[i] || '-'}`;
        }
        
      }
    }

    function hideAllExceptFirst() {
      if (!timeData.length || !imageList.length) return;
      gengaCount = 0;
      const frame0 = timeData[0];
      const displayTargets = new Set();

      // フレーム0で表示するserviceIdを収集
      frame0.forEach((index, i) => {
        if (!layerToggles[i]) return;
        const offset = layerOffsets[i] ?? 1;
        const adjusted = (i > 0 && index === 0) ? index + offset : index + offset - 1;
        const serviceId = imageListId[adjusted];
        if (!serviceId) return;
        displayTargets.add(serviceId);
      });

      // ✅ viewer内のitemたちをMapにキャッシュ（id → item）
      const viewerItemMap = new Map();
      const viewerCount = viewer.world.getItemCount();
      for (let i = 0; i < viewerCount; i++) {
        const item = viewer.world.getItemAt(i);
        const id = item.source['@id'] || item.source.id;
        viewerItemMap.set(id, item);
      }

      // 🔁 各 image に対して処理
      for (let i = imageList.length - 1; i >= 0; i--) {
        const img = imageList[i];
        if (!img?.id) continue;

        const serviceId = imageListId[i];
        const imageIndex = imageIdToIndex.get(serviceId);

        const isDisplayTarget = displayTargets.has(serviceId);
        const gengaOpacity = isDisplayTarget && imageIndex > 0 && gengaCount === 0
          ? 1
          : isDisplayTarget && imageIndex > 0
            ? layer_opacity[imageIndex]
            : 0.0;

        if (isDisplayTarget && imageIndex > 0 && gengaCount === 0) {
          gengaCount = 1;
        }

        const item = viewerItemMap.get(serviceId);
        if (item) {
          setLayerVisibility(serviceId, isDisplayTarget, gengaOpacity);
        } else {
          viewer.addTiledImage({
            tileSource: `${serviceId}/info.json`,
            opacity: isDisplayTarget ? 1.0 : 0.0,
            success: () => {
              setLayerVisibility(serviceId, isDisplayTarget, gengaOpacity);
            }
          });
        }
      }

      currentIndex = 0;
      showFrame(0);
    }


    function isSameFrame(a, b) {
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    function showNext() {
      const base = timeData[currentIndex];
      for (let i = currentIndex + 1; i < timeData.length; i++) {
        if (!isSameFrame(base, timeData[i])) {
          showFrame(i);
          return;
        }
      }
    }

    function showPrevious() {
      const current = timeData[currentIndex];
      if (!current) return;

      //今がブロック途中か？
      const isMiddle =
        currentIndex > 0 &&
        isSameFrame(current, timeData[currentIndex - 1]);

      //同じなら
      if (isMiddle) {
        let target = currentIndex;

        for (let i = currentIndex - 1; i >= 0; i--) {
          if (isSameFrame(timeData[i], current)) {
            target = i;
          } else {
            break;
          }
        }

        showFrame(target);
        return;
      }

      //そうでないなら
      let found = -1;

      for (let i = currentIndex - 1; i >= 0; i--) {
        if (!isSameFrame(timeData[i], current)) {
          found = i;
          break;
        }
      }
      if (found === -1) return;

      // 前ブロックの先頭へ
      for (let i = found - 1; i >= 0; i--) {
        if (isSameFrame(timeData[i], timeData[found])) {
          found = i;
        } else {
          break;
        }
      }

      showFrame(found);
    }


    function autoshowNext() {
      if (currentIndex < timeData.length - 1) {
        showFrame(currentIndex + 1);
        timeData[currentIndex]
      }
    }


    function reset() {
      hideAllExceptFirst();
    }

    function toggleAuto() {
      if (autoScroll) {
        stopAuto();
      } else {
        startAuto();
      }
    }

    function startAuto() {
  if (autoScroll) return;
  autoScroll = true;
  document.getElementById("autoBtn").textContent = "■ 停止";

  const fps = parseInt(document.getElementById("fps").value) || 24;
  const interval = 1000 / fps;

  let lastTime = performance.now();

  function loop(now) {
    if (!autoScroll) return;

    const elapsed = now - lastTime;

    if (elapsed >= interval) {
      lastTime = now;

      if (currentIndex >= timeData.length - 1) {
        reset();
      } else {
        autoshowNext();
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}




    function stopAuto() {
      autoScroll = false;
      clearTimeout(autoLoopId);
      document.getElementById("autoBtn").textContent = "▶ 自動";
    }

    window.addEventListener("DOMContentLoaded", () => {
        const params = new URLSearchParams(window.location.search);
        const iiifParam = params.get("iiif-content");
        if (iiifParam) {
            loadIIIF(iiifParam);
        }
    });

    function renderLayerControls() {
      const container = document.getElementById("layer-controls");

      // フレーム番号表示を再利用
      if (!numberDisplay) {
        const numberWrapper = document.createElement('div');
        numberDisplay = document.createElement('span');
        numberWrapper.appendChild(numberDisplay);
        container.appendChild(numberWrapper);
      }

      numberDisplay.textContent = `フレーム番号: ${currentIndex}`;
    }



    function toggleTimeSheet(){
      if(timeSheetVisible){
        closeTimeSheet();
      }
      else{
        showTimeSheet();
      }
    }

    //TimeSheet表示/非表示
    function showTimeSheet() {
        const timeSheetWindow = document.getElementById('time-sheet-window');
        if (timeSheetUrl) {
          timeSheetWindow.style.display = 'block';
          const normalizeTimeSheetUrl = normalizeIIIFInfoUrl(timeSheetUrl);
          console.log(normalizeTimeSheetUrl)
          if (!timeSheetViewer) {
            timeSheetViewer = OpenSeadragon({
              id: "time-sheet-content",
              prefixUrl: "../openseadragon/images/", 
              tileSources: normalizeTimeSheetUrl,
              gestureSettingsTouch: {
                pinchToZoom: true,
                scrollToZoom: true,
                clickToZoom: true
              },
              showNavigationControl: true,
              preload: true
            });
          }
          timeSheetVisible = true;
        }
      }
  
      function closeTimeSheet() {
        document.getElementById('time-sheet-window').style.display = 'none';
        timeSheetVisible = false;
      }

      function normalizeIIIFInfoUrl(url) {
        if (!url) return null;

        if (url.endsWith('/info.json')) {
          return url;
        }
        return url.replace(/\/$/, '') + '/info.json';
      }


      // タイムシート操作
      let isDraggingT = false;
      let offsetX = 0;
      let offsetY = 0;
      
      const timeSheetWindow = document.getElementById('time-sheet-window');
      const timeSheetHeader = document.getElementById('time-sheet-header');
  
      timeSheetHeader.addEventListener('mousedown', (e) => {
        isDraggingT = true;
        offsetX = e.clientX - timeSheetWindow.offsetLeft;
        offsetY = e.clientY - timeSheetWindow.offsetTop;
        document.addEventListener('mousemove', moveWindow);
        document.addEventListener('mouseup', stopDragging);
      });
  
      function moveWindow(e) {
        if (isDraggingT) {
          timeSheetWindow.style.left = `${e.clientX - offsetX}px`;
          timeSheetWindow.style.top = `${e.clientY - offsetY}px`;
        }
      }
  
      function stopDragging() {
        if (!isDraggingT) return;
        isDraggingT = false;
        document.removeEventListener('mousemove', moveWindow);
        document.removeEventListener('mouseup', stopDragging);
      }

      new ResizeObserver(() => {
        if (timeSheetViewer) {
          timeSheetViewer.viewport.resize();
        }
      }).observe(timeSheetWindow);


      //修正原画用スライダー
      document.addEventListener("DOMContentLoaded", () => {
      const slider = document.getElementById("globalOpacitySlider");
      const display = document.getElementById("globalOpacityDisplay");

      slider.value = secondaryGengaOpacityRatio;
      display.textContent = parseFloat(slider.value).toFixed(2);

      slider.oninput = () => {
        secondaryGengaOpacityRatio = parseFloat(slider.value);
        display.textContent = secondaryGengaOpacityRatio.toFixed(2);
        showFrame(currentIndex); // 再描画
      };
    });


//ショートカット
const shortcuts = initShortcuts({
  showNext,
  showPrevious,
  toggleAuto,
  reset,
  toggleTimeSheet,
  dougaViewToggle,
  gengaViewToggle,
  filterCheckbox: checkbox,
  layerToggles,
  layerCheckboxes,
  startAuto,
  stopAuto,
  autoScroll
});

//ボタン操作系
window.showNext = showNext;
window.showPrevious = showPrevious;
window.toggleAuto = toggleAuto;
window.reset = reset;
window.toggleTimeSheet = toggleTimeSheet;
window.closeTimeSheet = closeTimeSheet;

