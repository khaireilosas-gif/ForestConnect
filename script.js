document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. THEME TOGGLE (DARK/LIGHT MODE)
    // ==========================================
    // Target the exact ID of the button
    const toggleBtn = document.getElementById('theme-toggle'); 
    const body = document.body;
    
    // Check browser memory when the page loads
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '☀️ Light'; 
    } else {
        body.classList.remove('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '🌙 Dark'; 
    }
    
    // Listen for the click
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            
            // Check if it is currently dark or light after the click
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                toggleBtn.innerHTML = '☀️ Light'; 
            } else {
                localStorage.setItem('theme', 'light');
                toggleBtn.innerHTML = '🌙 Dark'; 
            }
        });
    }

    // ... (Keep the rest of your script.js code below this!)

    // --- B. Mobile Hamburger Menu ---
    const menuIcon = document.getElementById('menu-icon');
    const navLinks = document.getElementById('nav-links');
    if (menuIcon && navLinks) {
        menuIcon.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuIcon.innerHTML = navLinks.classList.contains('active') ? '✕' : '☰';
        });
    }

    // --- C. Smart Navbar Hiding ---
    const navbar = document.querySelector('.navbar');
    const sidebar = document.getElementById('sidebar');
    let lastScrollTop = 0;

    if (navbar) {
        // 1. For Normal Pages (Scroll the whole window)
        window.addEventListener('scroll', () => {
            if (sidebar) return; // Skip this if we are on the dashboard
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) navbar.style.top = (scrollTop > lastScrollTop) ? "-100px" : "0";
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
        }, { passive: true });

        // 2. For Dashboard Pages (Scroll the sidebar only)
        if (sidebar) {
            sidebar.addEventListener('scroll', () => {
                let scrollTop = sidebar.scrollTop;
                if (scrollTop > 50) navbar.style.top = (scrollTop > lastScrollTop) ? "-100px" : "0";
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
            }, { passive: true });
        }
    }


    // ==========================================
    // PART 2: MAP DASHBOARD (RUNS ONLY ON MAP PAGE)
    // ==========================================
    const mapElement = document.getElementById('map');
    
    if (mapElement) {
        const map = L.map('map').setView([4.2105, 101.9758], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        let tempMarker;
        let selectedLat = null;
        let selectedLng = null;
        let heatLayer = null; 
        const markersLayer = L.layerGroup().addTo(map);

        // --- A. Pin Generators ---
        const createPin = (color) => L.divIcon({
            className: 'custom-svg-pin',
            html: `<svg viewBox="0 0 24 24" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
                   </svg>`,
            iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42]
        });

        const blueIcon = createPin('#3498db'); 
        const redIcon = createPin('#e74c3c');  
        const goldIcon = createPin('#f1c40f'); 

        const createStatPin = (color, text) => L.divIcon({
            className: 'custom-svg-pin',
            html: `<svg viewBox="0 0 24 24" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
                    <text x="12" y="13" font-size="8" text-anchor="middle" fill="white" font-weight="bold" font-family="sans-serif">${text}</text>
                   </svg>`,
            iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42]
        });

        const hotPin = createStatPin('#e74c3c', 'H');  
        const coldPin = createStatPin('#3498db', 'C'); 
        const nullPin = createStatPin('#95a5a6', '-'); 

        // --- B. Load Map Data (Apple-Style Pins & Heatmap) ---
        async function fetchLiveReports() {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/reports?t=' + new Date().getTime());
                const data = await response.json();
                
                markersLayer.clearLayers();
                if(heatLayer) map.removeLayer(heatLayer); 
                
                let heatCoordinates = [];
                const togglePhotosEl = document.getElementById('toggle-photos');
                const showPhotos = togglePhotosEl ? togglePhotosEl.checked : true;

                data.forEach((report, index) => {
                    const lat = parseFloat(report.lat);
                    const lng = parseFloat(report.lng);
                    if (isNaN(lat) || isNaN(lng)) return;

                    heatCoordinates.push([lat, lng, 1.0]);

                    let iconToUse;

                    if (showPhotos && report.image_url && report.image_url !== "[null]") {
                        const shadowColor = report.severity === 'CRITICAL' ? 'rgba(231, 76, 60, 0.8)' : 'rgba(0, 0, 0, 0.4)';
                        const displayNum = index + 1;

                        iconToUse = L.divIcon({
                            className: 'custom-photo-pin',
                            html: `
                            <div style="position: relative; width: 75px; height: 75px; filter: drop-shadow(0px 8px 12px ${shadowColor}); transition: transform 0.2s;">
                                <div style="width: 100%; height: 100%; background: white; border-radius: 18px; padding: 3px; box-sizing: border-box; position: relative; z-index: 2;">
                                    <div style="width: 100%; height: 100%; border-radius: 14px; overflow: hidden; position: relative;">
                                        <img src="http://127.0.0.1:8000${report.image_url}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>
                                        <div style="position: absolute; bottom: 4px; left: 8px; color: white; font-family: -apple-system, sans-serif; font-size: 15px; font-weight: bold;">${displayNum}</div>
                                    </div>
                                </div>
                                <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 12px solid white; z-index: 1;"></div>
                            </div>`,
                            iconSize: [75, 87], iconAnchor: [37.5, 87], popupAnchor: [0, -87] 
                        });
                    } else {
                        iconToUse = report.severity === "CRITICAL" ? redIcon : blueIcon;
                    }

                    const marker = L.marker([lat, lng], { icon: iconToUse }).addTo(markersLayer);

                    const isCritical = report.severity === "CRITICAL";
                    let popupHtml = `
                        <div class="popup-custom-header ${isCritical ? 'critical' : ''}">
                            ${isCritical ? '🚨 CRITICAL: ' : '⚠️ '}${report.type}
                        </div>
                        <div class="popup-custom-body">
                            <div style="color: #444; font-size: 13px; line-height: 1.4;">${report.desc}</div>
                    `;
                    
                    if (report.image_url && report.image_url !== "[null]") {
                        popupHtml += `<img src="http://127.0.0.1:8000${report.image_url}" class="popup-custom-img">`;
                    }
                    popupHtml += `</div>`;
                    
                    marker.bindPopup(popupHtml);
                });

                if (heatCoordinates.length > 0) {
                    // Requires leaflet-heat.js to be loaded in the HTML
                    try {
                        heatLayer = L.heatLayer(heatCoordinates, { 
                            radius: 35, blur: 25, maxZoom: 12, minOpacity: 0.5, gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'orange', 1.0: 'red'} 
                        }).addTo(map);
                    } catch (e) { console.warn("Heatmap script missing, skipping heatmap rendering."); }
                }

            } catch (error) {
                console.error("Database connection failed:", error);
            }
        }
        
        fetchLiveReports();

        const togglePhotosBtn = document.getElementById('toggle-photos');
        if (togglePhotosBtn) {
            togglePhotosBtn.addEventListener('change', fetchLiveReports);
        }

        // --- C. Location & Map Click Logic ---
        // --- C. Smart Navbar Hiding ---
    const navbar = document.querySelector('.navbar');
    const sidebar = document.getElementById('sidebar');
    let lastWindowScroll = 0;
    let lastSidebarScroll = 0;

    if (navbar) {
        // 1. Listen to the main window scrolling (Works for Hero Video pages & Normal pages)
        window.addEventListener('scroll', () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) {
                navbar.style.top = (scrollTop > lastWindowScroll) ? "-100px" : "0";
            } else {
                navbar.style.top = "0"; // Always show at the absolute top of the page
            }
            lastWindowScroll = scrollTop <= 0 ? 0 : scrollTop; 
        }, { passive: true });

        // 2. Listen to the sidebar scrolling (Works when user is filling out the form)
        if (sidebar) {
            sidebar.addEventListener('scroll', () => {
                let scrollTop = sidebar.scrollTop;
                if (scrollTop > 50) {
                    navbar.style.top = (scrollTop > lastSidebarScroll) ? "-100px" : "0";
                }
                lastSidebarScroll = scrollTop <= 0 ? 0 : scrollTop; 
            }, { passive: true });
        }
    }

        // --- D. Form Submission Logic ---
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const typeVal = document.getElementById('threat-type').value;
                const descVal = document.getElementById('description').value;

                if (!selectedLat || !selectedLng) { alert("🚨 STOP! You must click on the map or use your location first!"); return; }
                if (!typeVal) { alert("🚨 STOP! Please select a Threat Type from the dropdown!"); return; }
                if (!descVal.trim()) { alert("🚨 STOP! Please type a description of the threat!"); return; }

                submitBtn.innerHTML = "⏳ Sending..."; 
                
                const formData = new FormData();
                formData.append("type", typeVal);
                formData.append("description", descVal);
                formData.append("lat", selectedLat);
                formData.append("lng", selectedLng);

                const imageInput = document.getElementById('report-image');
                if (imageInput.files.length > 0) { formData.append("file", imageInput.files[0]); }

                try {
                    const response = await fetch('http://127.0.0.1:8000/api/reports', { method: 'POST', body: formData });
                    
                    if(response.ok) {
                        alert("✅ SUCCESS! Report saved to Database."); 
                        document.getElementById('threat-form').reset();
                        
                        const coordBox = document.getElementById('coord-box');
                        if (coordBox) coordBox.innerHTML = `Lat: --.---- , Lng: --.----`;
                        
                        selectedLat = null; selectedLng = null;
                        if(tempMarker) map.removeLayer(tempMarker);
                        
                        fetchLiveReports(); 
                    } else {
                        const errorData = await response.json();
                        alert("❌ Backend Error: " + (errorData.detail || "Database rejected it."));
                    }
                } catch (error) { 
                    alert("❌ Connection lost! Is main.py running?"); 
                } finally {
                    submitBtn.innerHTML = "Submit Report"; 
                }
            });
        }

        // --- E. Spatial Intelligence Analysis ---
        const hotspotBtn = document.getElementById('hotspot-btn');
        const resetMapBtn = document.getElementById('reset-map-btn');

        if (hotspotBtn && resetMapBtn) {
            hotspotBtn.addEventListener('click', async () => {
                hotspotBtn.innerHTML = "⏳ Calculating...";
                const togglePhotosEl = document.getElementById('toggle-photos');
                if(togglePhotosEl) togglePhotosEl.checked = false;

                try {
                    const response = await fetch('http://127.0.0.1:8000/api/hotspots');
                    const result = await response.json();
                    
                    if (result.status === "error") { alert("⚠️ " + result.message); hotspotBtn.innerHTML = "🔥 Run Getis-Ord Gi* Analysis"; return; }

                    markersLayer.clearLayers(); 
                    if(heatLayer) map.removeLayer(heatLayer); 
                    
                    result.data.forEach(report => {
                        let iconToUse = nullPin;
                        let clusterText = "<b style='color: gray;'>Not Significant Cluster</b>";
                        
                        if (report.cluster_type === "HOTSPOT") { iconToUse = hotPin; clusterText = "<b style='color: red;'>🔥 95% Confidence Hotspot</b>"; } 
                        else if (report.cluster_type === "COLDSPOT") { iconToUse = coldPin; clusterText = "<b style='color: blue;'>❄️ 95% Confidence Coldspot</b>"; }

                        const popupHtml = `
                            <div class="popup-custom-header" style="background:#2E7D32;">Spatial Intelligence Data</div>
                            <div class="popup-custom-body" style="text-align: center;">${clusterText}<br><hr><b>${report.type}</b><br>Z-Score: <b>${report.z_score}</b></div>`;

                        L.marker([report.lat, report.lng], {icon: iconToUse}).bindPopup(popupHtml).addTo(markersLayer);
                    });

                    alert("✅ Getis-Ord Gi* Analysis Complete!");
                } catch (error) {
                    alert("❌ Failed to run spatial analysis. Is main.py running?");
                }
                hotspotBtn.innerHTML = "🔥 Run Getis-Ord Gi* Analysis";
            });

            resetMapBtn.addEventListener('click', () => { 
                const togglePhotosEl = document.getElementById('toggle-photos');
                if(togglePhotosEl) togglePhotosEl.checked = true; 
                fetchLiveReports(); 
            });
        }
    }

    // ==========================================
    // PART 3: FOREST AI CHATBOX (RUNS ONLY IF PRESENT)
    // ==========================================
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatOutput = document.getElementById('ai-chat-output');

    if (aiChatForm && aiChatInput && aiChatOutput) {
        aiChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userText = aiChatInput.value.trim();
            if (!userText) return;

            aiChatOutput.innerHTML += `<div style="margin-bottom: 15px; text-align: right;"><span style="background: #2E7D32; color: white; padding: 10px 15px; border-radius: 18px; display: inline-block; max-width: 80%;">${userText}</span></div>`;
            aiChatInput.value = '';
            
            const loadingId = 'loading-' + Date.now();
            aiChatOutput.innerHTML += `<div id="${loadingId}" style="margin-bottom: 15px; color: #555; font-style: italic; font-size: 0.9em;">📡 Querying OpenAlex academic archives...</div>`;
            aiChatOutput.scrollTop = aiChatOutput.scrollHeight;

            try {
                const response = await fetch('http://127.0.0.1:8000/api/forest-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: userText }) });
                const data = await response.json();
                document.getElementById(loadingId).remove();

                if (response.ok) {
                    const formattedAnswer = data.answer.replace(/\n/g, '<br>');
                    let aiHtml = `<div style="margin-bottom: 20px; background: var(--card-bg, #f9fdf9); padding: 15px; border-radius: 12px; border-left: 5px solid #2E7D32;"><div style="color: #2E7D32; font-weight: bold; margin-bottom: 8px;">🌳 ForestConnect Academic Expert</div><div>${formattedAnswer}</div>`;

                    if (data.sources && data.sources.length > 0) {
                        aiHtml += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0;"><span style="font-weight: bold; color: #555;">Academic Sources:</span><ul style="margin: 8px 0 0 0; padding-left: 18px;">`;
                        data.sources.forEach(source => {
                            const link = source.url && source.url !== '#' ? source.url : '#';
                            aiHtml += `<li style="margin-bottom: 8px;"><span style="color: #555; font-weight: bold;">[${source.id}]</span> ${link !== '#' ? `<a href="${link}" target="_blank" style="color: #1a73e8;">${source.title} (${source.year}) 🔗</a>` : `<span style="color: #333;">${source.title} (${source.year})</span>`}</li>`;
                        });
                        aiHtml += `</ul></div>`;
                    }
                    aiHtml += `</div>`;
                    aiChatOutput.innerHTML += aiHtml;
                } else {
                    aiChatOutput.innerHTML += `<div style="color: #d32f2f; margin-bottom: 15px;">⚠️ AI processing error.</div>`;
                }
            } catch (error) {
                if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
                aiChatOutput.innerHTML += `<div style="color: #d32f2f; margin-bottom: 15px;">⚠️ Connection failed. Is the FastAPI server active?</div>`;
            }
            aiChatOutput.scrollTop = aiChatOutput.scrollHeight;
        });
    }
});