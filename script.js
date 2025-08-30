document.addEventListener('DOMContentLoaded', () => {
    // --- GESTION DE LA CLÉ API ---
    const apiKeyOverlay = document.getElementById('api-key-overlay');
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const apiKeyError = document.getElementById('api-key-error');
    let userApiKey = localStorage.getItem('userApiKey');

    const showApiKeyModal = (error = '') => {
        apiKeyError.textContent = error;
        apiKeyError.classList.toggle('hidden', !error);
        apiKeyOverlay.classList.remove('hidden');
    };

    const hideApiKeyModal = () => {
        apiKeyOverlay.classList.add('hidden');
    };

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('userApiKey', key);
            userApiKey = key;
            hideApiKeyModal();
        } else {
            showApiKeyModal('Veuillez entrer une clé API valide.');
        }
    });

    if (!userApiKey) {
        showApiKeyModal();
    }

    const getThemeColor = (varName) => getComputedStyle(document.body).getPropertyValue(varName).trim();

    // --- MOTEUR 1 : SPHÈRE 3D INTERACTIVE ---
    const sphereCanvas = document.getElementById('particle-canvas');
    const sphereCtx = sphereCanvas.getContext('2d');
    let nodes = []; let mouse = { x: null, y: null };
    class Node { constructor() { this.theta = Math.random() * 2 * Math.PI; this.phi = Math.acos((Math.random() * 2) - 1); this.x=0; this.y=0; this.z=0; this.xProjected=0; this.yProjected=0; this.scaleProjected=0; } }
    function initSphere() { sphereCanvas.width = window.innerWidth; sphereCanvas.height = window.innerHeight; nodes = []; const n = 300; for(let i=0; i<n; i++) nodes.push(new Node()); }
    let rotX = 0.0001, rotY = 0.0001; const damp = 0.98;
    function animateSphere() {
        sphereCtx.clearRect(0,0,sphereCanvas.width,sphereCanvas.height);
        const cx = sphereCanvas.width/2, cy = sphereCanvas.height/2, rY = cy*0.9, rX = cx*1.1, p = sphereCanvas.width*0.8;
        if (mouse.x !== null) { rotY += (mouse.x - cx)*0.000003; rotX += (mouse.y - cy)*0.000003; }
        rotX *= damp; rotY *= damp;
        const minSpeed = 0.00005;
        if(Math.abs(rotX) < minSpeed) rotX = Math.sign(rotX)*minSpeed || minSpeed;
        if(Math.abs(rotY) < minSpeed) rotY = Math.sign(rotY)*minSpeed || minSpeed;
        nodes.forEach(n => {
            n.theta += rotY; n.phi += rotX;
            n.x = rX * Math.sin(n.phi) * Math.cos(n.theta); n.y = rY * Math.cos(n.phi); n.z = rX * Math.sin(n.phi) * Math.sin(n.theta) * 0.5;
            n.scaleProjected = p / (p + n.z); n.xProjected = (n.x * n.scaleProjected) + cx; n.yProjected = (n.y * n.scaleProjected) + cy;
        });
        sphereCtx.strokeStyle = getThemeColor('--particle-link-color'); sphereCtx.lineWidth = 1;
        for (let i=0; i<nodes.length; i++) for (let j=i+1; j<nodes.length; j++) {
            const d = Math.sqrt((nodes[i].x-nodes[j].x)**2 + (nodes[i].y-nodes[j].y)**2 + (nodes[i].z-nodes[j].z)**2);
            if(d < Math.min(rX, rY)*0.3) { sphereCtx.beginPath(); sphereCtx.moveTo(nodes[i].xProjected, nodes[i].yProjected); sphereCtx.lineTo(nodes[j].xProjected, nodes[j].yProjected); sphereCtx.stroke(); }
        }
        sphereCtx.fillStyle = getThemeColor('--particle-color');
        nodes.forEach(n => { sphereCtx.beginPath(); sphereCtx.arc(n.xProjected, n.yProjected, 2*n.scaleProjected, 0, Math.PI*2); sphereCtx.fill(); });
        requestAnimationFrame(animateSphere);
    }
    
    // --- MOTEUR 2 : "CONSTELLATION NUMÉRIQUE" ---
    const bgCanvas = document.getElementById('background-canvas'); const bgCtx = bgCanvas.getContext('2d'); let stars = [];
    class Star { constructor() {this.x=Math.random()*bgCanvas.width; this.y=Math.random()*bgCanvas.height; this.size=Math.random()*1.5+0.5; this.speed=Math.random()*0.2+0.1; this.opacity=Math.random()*0.5+0.2;} update() {this.y+=this.speed; if(this.y > bgCanvas.height){this.y=0; this.x=Math.random()*bgCanvas.width;}} draw() {bgCtx.beginPath(); bgCtx.arc(this.x,this.y,this.size,0,Math.PI*2); bgCtx.fillStyle=`rgba(136,146,176,${this.opacity})`; bgCtx.fill();}}
    function initBackground() { bgCanvas.width=window.innerWidth; bgCanvas.height=window.innerHeight; stars=[]; const n=200; for(let i=0;i<n;i++) stars.push(new Star()); }
    function animateBackground() { bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height); stars.forEach(s => {s.update(); s.draw();}); requestAnimationFrame(animateBackground); }

    // --- INITIALISATION ---
    initSphere(); animateSphere(); initBackground(); animateBackground();
    window.addEventListener('resize', () => { initSphere(); initBackground(); });
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

    // --- LOGIQUE APPLICATIVE ---
    const generateBtn = document.getElementById('generateBtn'); const promptInput = document.getElementById('prompt-input'); const resultContainer = document.getElementById('result-container'); const responseTitle = document.getElementById('response-title'); const exampleBtns = document.querySelectorAll('.example-btn'); const originalBtnContent = generateBtn.innerHTML; const loadingIndicator = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    const analyzerSection = document.getElementById('analyzer-section'); const promptScore = document.getElementById('prompt-score'); const promptFeedback = document.getElementById('prompt-feedback'); const historySection = document.getElementById('history-section'); const averageScoreEl = document.getElementById('average-score'); const commonMistakeEl = document.getElementById('common-mistake'); const scoreChartEl = document.getElementById('score-chart');
    const suggestionContainer = document.getElementById('suggestion-container'); const improvedPromptText = document.getElementById('improved-prompt-text'); const useImprovedPromptBtn = document.getElementById('use-improved-prompt-btn');

    exampleBtns.forEach(btn => btn.addEventListener('click', () => { promptInput.value = btn.getAttribute('data-prompt'); promptInput.focus(); }));
    document.querySelectorAll('.card').forEach(card => card.addEventListener('mousemove', e => { const r=card.getBoundingClientRect(); card.style.setProperty('--mouse-x',`${e.clientX-r.left}px`); card.style.setProperty('--mouse-y',`${e.clientY-r.top}px`); }));
    const observer = new IntersectionObserver(es => es.forEach(e => {if(e.isIntersecting)e.target.classList.add('visible');}), {threshold:0.1});
    document.querySelectorAll('.section').forEach(s => observer.observe(s));

    const MODEL_NAME = 'gemini-1.5-flash-latest';
    
    async function makeApiCall(promptText) {
        if (!userApiKey) {
            throw new Error("Clé API manquante. Veuillez en fournir une.");
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${userApiKey}`;
        const res = await fetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Erreur HTTP: ${res.status}`);
        return data.candidates[0].content.parts[0].text;
    }

    const handleGeneration = async () => {
        const prompt = promptInput.value.trim(); if (!prompt) { alert("Veuillez entrer une instruction."); return; }
        generateBtn.disabled = true; generateBtn.innerHTML = '<div class="btn-spinner"></div>';
        responseTitle.style.display = 'block';
        const currentHeight = resultContainer.offsetHeight; resultContainer.style.minHeight = `${currentHeight}px`;
        resultContainer.classList.remove('has-content'); resultContainer.innerHTML = loadingIndicator;
        analyzerSection.style.display = 'none';

        try {
            const analyzerPrompt = `Tu es un expert en "prompt engineering". Analyse le prompt utilisateur suivant. Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. L'objet doit avoir trois clés : "score" (nombre de 1 à 100), "feedback" (tableau de 2-3 chaînes de caractères), et "improved_prompt" (une réécriture experte du prompt original pour viser un score de 100). Prompt à analyser : "${prompt}"`;
            
            const [mainResponse, analysisResponse] = await Promise.all([
                makeApiCall(prompt),
                makeApiCall(analyzerPrompt)
            ]);

            resultContainer.innerHTML = marked.parse(mainResponse);
            resultContainer.classList.add('has-content');
            
            const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("L'analyse du prompt n'a pas retourné un JSON valide.");
            
            const analysisData = JSON.parse(jsonMatch[0]);
            updateAnalyzerUI(analysisData);
            manageHistory(prompt, analysisData);

        } catch (error) {
            console.error('API Error:', error);
            // Si la clé est invalide, on la supprime et on demande à nouveau
            if (error.message.includes('API key not valid')) {
                localStorage.removeItem('userApiKey');
                userApiKey = null;
                showApiKeyModal('Votre clé API est invalide. Veuillez la vérifier.');
            }
            resultContainer.innerHTML = `<p class="reveal-on-load" style="color:#ff8a80;">Une erreur est survenue : ${error.message}</p>`;
            resultContainer.classList.add('has-content');
        } finally {
            generateBtn.disabled = false; generateBtn.innerHTML = originalBtnContent;
            setTimeout(() => { 
                const el = resultContainer.querySelector('p.reveal-on-load');
                if (el) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
                resultContainer.style.minHeight = '200px'; 
            }, 50);
        }
    };
    generateBtn.addEventListener('click', handleGeneration);

    function updateAnalyzerUI(data) {
        analyzerSection.style.display = 'block';
        promptScore.textContent = data.score || '--';
        promptFeedback.innerHTML = '';
        if (data.feedback && data.feedback.length > 0) {
            data.feedback.forEach(text => {
                const li = document.createElement('li');
                li.textContent = text;
                promptFeedback.appendChild(li);
            });
        }
        if (data.improved_prompt) {
            suggestionContainer.style.display = 'block';
            improvedPromptText.textContent = data.improved_prompt;
        } else {
            suggestionContainer.style.display = 'none';
        }
    }
    
    useImprovedPromptBtn.addEventListener('click', () => {
        promptInput.value = improvedPromptText.textContent;
        promptInput.focus();
        promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    function manageHistory(prompt, analysisData) {
        const history = JSON.parse(localStorage.getItem('promptHistory')) || [];
        history.push({ prompt, ...analysisData, date: new Date().toISOString() });
        localStorage.setItem('promptHistory', JSON.stringify(history));
        displayHistoricalAnalysis();
    }

    function displayHistoricalAnalysis() {
        const history = JSON.parse(localStorage.getItem('promptHistory')) || [];
        if (history.length === 0) return;

        historySection.style.display = 'block';

        const last5 = history.slice(-5);
        const avg = last5.reduce((sum, item) => sum + item.score, 0) / last5.length;
        averageScoreEl.textContent = Math.round(avg);

        const feedbackCounts = {};
        history.forEach(item => {
            if (item.feedback) item.feedback.forEach(fb => {
                feedbackCounts[fb] = (feedbackCounts[fb] || 0) + 1;
            });
        });
        const commonMistake = Object.keys(feedbackCounts).reduce((a, b) => feedbackCounts[a] > feedbackCounts[b] ? a : b, 'Aucune erreur récurrente détectée.');
        commonMistakeEl.textContent = commonMistake;
        
        scoreChartEl.innerHTML = '';
        const last10 = history.slice(-10);
        last10.forEach(item => {
            const bar = document.createElement('div');
            bar.className = 'score-bar';
            bar.style.height = `${item.score}%`;
            bar.setAttribute('data-score', item.score);
            scoreChartEl.appendChild(bar);
        });
    }

    // --- Gestion du Thème ---
    const themeSwitcher = document.getElementById('theme-switcher'); const storageKey = 'theme-preference';
    const applyTheme = (theme) => document.body.classList.toggle('light-theme', theme === 'light');
    const toggleTheme = () => { const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light'; localStorage.setItem(storageKey, newTheme); applyTheme(newTheme); };
    themeSwitcher.addEventListener('click', toggleTheme);
    const savedTheme = localStorage.getItem(storageKey); const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) applyTheme(savedTheme); else if (prefersDark) applyTheme('dark'); else applyTheme('light');
    
    // Afficher l'historique au chargement
    displayHistoricalAnalysis();
});