// IoT Dashboard - ESP32 Firebase REST API
// Simple polling method - No authentication needed

// Firebase REST API URL (only the data path needed)
const FIREBASE_URL = "https://project5-b8e7b-default-rtdb.asia-southeast1.firebasedatabase.app/sensors.json";

const SENSOR_CONFIG = {
    temperature: { alertHigh: 35, alertLow: 5 },
    humidity: { alertHigh: 80, alertLow: 20 },
    waterLevel: { alertLow: 15, alertHigh: 95 }
};

let dataLog = [];
let pollInterval = null;

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', function() {
    console.log("📱 Dashboard Starting...");
    
    // Add button listeners
    document.getElementById('clearLogBtn').addEventListener('click', clearDataLog);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Fetch immediately
    fetchSensorData();
    
    // Poll every 2 seconds for updates
    pollInterval = setInterval(fetchSensorData, 2000);
    console.log("✓ Dashboard Ready - Polling every 2 seconds");
});

// ===== Fetch Sensor Data from Firebase =====
async function fetchSensorData() {
    try {
        console.log(`📡 Fetching from: ${FIREBASE_URL}`);
        
        const response = await fetch(FIREBASE_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✓ Data received:', data);
        
        if (data && data.temperature !== undefined && data.humidity !== undefined && data.waterLevel !== undefined) {
            updateDisplay(data);
            updateFirebaseStatus(true);
            addToLog(data);
        } else {
            console.warn('⚠️ Incomplete data:', data);
            updateFirebaseStatus(false);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        updateFirebaseStatus(false);
    }
}

// ===== Update Dashboard Display =====
function updateDisplay(data) {
    const temp = parseFloat(data.temperature) || 0;
    const humid = parseFloat(data.humidity) || 0;
    const water = parseFloat(data.waterLevel) || 0;
    
    // Update Temperature
    document.getElementById('tempValue').textContent = temp.toFixed(1);
    document.getElementById('tempStatus').textContent = getTempStatus(temp);
    
    // Update Humidity
    document.getElementById('humidityValue').textContent = humid.toFixed(1);
    document.getElementById('humidityStatus').textContent = getHumidityStatus(humid);
    
    // Update Water Level
    document.getElementById('waterValue').textContent = water.toFixed(1);
    document.getElementById('waterStatus').textContent = getWaterStatus(water);
    
    // Update water fill bar
    const waterFill = document.getElementById('waterFill');
    if (waterFill) waterFill.style.height = water + '%';
    
    updateTimestamp();
    checkAlerts(temp, humid, water);
}

// ===== Status Messages =====
function getTempStatus(temp) {
    if (temp < 10) return '❄️ Cold';
    if (temp < 20) return '🧊 Cool';
    if (temp < 30) return '😊 Comfortable';
    if (temp < 40) return '☀️ Warm';
    return '🔥 Hot';
}

function getHumidityStatus(humid) {
    if (humid < 30) return '🏜️ Dry';
    if (humid < 50) return '✅ Normal';
    if (humid < 70) return '💨 Moist';
    return '🌧️ Very Humid';
}

function getWaterStatus(level) {
    if (level < 20) return '⚠️ Low';
    if (level < 50) return '⬇️ Medium';
    if (level < 80) return '⬆️ High';
    return '🌊 Full';
}

// ===== Check for Alerts =====
function checkAlerts(temp, humid, water) {
    if (temp > SENSOR_CONFIG.temperature.alertHigh) {
        showAlert(`🔥 High Temperature: ${temp.toFixed(1)}°C`, 'error');
    }
    if (temp < SENSOR_CONFIG.temperature.alertLow) {
        showAlert(`❄️ Low Temperature: ${temp.toFixed(1)}°C`, 'error');
    }
    if (humid > SENSOR_CONFIG.humidity.alertHigh) {
        showAlert(`💨 High Humidity: ${humid.toFixed(1)}%`, 'error');
    }
    if (water < SENSOR_CONFIG.waterLevel.alertLow) {
        showAlert(`⚠️ Low Water Level: ${water.toFixed(1)}%`, 'error');
    }
    if (water > SENSOR_CONFIG.waterLevel.alertHigh) {
        showAlert(`🌊 High Water Level: ${water.toFixed(1)}%`, 'error');
    }
}

// ===== Data Logging =====
function addToLog(data) {
    const entry = {
        timestamp: new Date().toLocaleString(),
        temperature: parseFloat(data.temperature).toFixed(1),
        humidity: parseFloat(data.humidity).toFixed(1),
        waterLevel: parseFloat(data.waterLevel).toFixed(1)
    };
    
    dataLog.unshift(entry);
    if (dataLog.length > 100) dataLog.pop();
    
    updateTable();
}

function updateTable() {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    
    if (dataLog.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No data yet...</td></tr>';
        return;
    }
    
    tbody.innerHTML = dataLog.map(entry => `
        <tr>
            <td>${entry.timestamp}</td>
            <td>${entry.temperature}</td>
            <td>${entry.humidity}</td>
            <td>${entry.waterLevel}</td>
        </tr>
    `).join('');
}

function clearDataLog() {
    if (confirm('Clear all data?')) {
        dataLog = [];
        updateTable();
        showAlert('✓ Data cleared', 'success');
    }
}

function exportToCSV() {
    if (dataLog.length === 0) {
        showAlert('No data to export', 'info');
        return;
    }
    
    let csv = 'Timestamp,Temperature (°C),Humidity (%),Water Level (%)\n';
    dataLog.forEach(entry => {
        csv += `${entry.timestamp},${entry.temperature},${entry.humidity},${entry.waterLevel}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showAlert('✓ Data exported', 'success');
}

// ===== UI Updates =====
function updateFirebaseStatus(connected) {
    const el = document.getElementById('firebaseStatus');
    if (el) {
        el.textContent = connected ? '● Connected' : '● Disconnected';
        el.className = connected ? 'status-online' : 'status-offline';
    }
}

function updateTimestamp() {
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = new Date().toLocaleTimeString();
}

function showAlert(msg, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = msg;
    container.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}

// Cleanup on exit
window.addEventListener('beforeunload', function() {
    if (pollInterval) clearInterval(pollInterval);
});

console.log('✓ Dashboard Script Loaded');


// ===== AI Chatbot & Speech Control =====
document.addEventListener('DOMContentLoaded', function() {
    // Chatbot send button
    const sendBtn = document.getElementById('chatbotSendBtn');
    const input = document.getElementById('chatbotInput');
    const messages = document.getElementById('chatbotMessages');
    const micBtn = document.getElementById('micBtn');
    let recognizing = false;
    let recognition;

    // Simple AI logic (replace with real API for advanced use)
    function getAIResponse(userMsg) {
        userMsg = userMsg.toLowerCase();
        if (userMsg.includes('temperature')) return `Current temperature: ${document.getElementById('tempValue').textContent}°C.`;
        if (userMsg.includes('humidity')) return `Current humidity: ${document.getElementById('humidityValue').textContent}%.`;
        if (userMsg.includes('water')) return `Current water level: ${document.getElementById('waterValue').textContent}%.`;
        if (userMsg.includes('export')) { exportToCSV(); return 'Exported data to CSV.'; }
        if (userMsg.includes('clear')) { clearDataLog(); return 'Cleared the data log.'; }
        if (userMsg.includes('help')) return 'You can ask about temperature, humidity, water level, or say export/clear.';
        return "I'm your dashboard AI! Ask about sensor data or say 'help'.";
    }

    function appendMessage(msg, sender = 'user') {
        const div = document.createElement('div');
        div.className = sender === 'user' ? 'chatbot-user' : 'chatbot-ai';
        div.textContent = msg;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function handleChat() {
        const userMsg = input.value.trim();
        if (!userMsg) return;
        appendMessage(userMsg, 'user');
        input.value = '';
        setTimeout(() => {
            const aiMsg = getAIResponse(userMsg);
            appendMessage(aiMsg, 'ai');
        }, 400);
    }

    sendBtn.addEventListener('click', handleChat);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleChat(); });

    // ===== Speech Recognition =====
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = function() {
            recognizing = true;
            document.getElementById('micIcon').textContent = '🔴';
        };
        recognition.onend = function() {
            recognizing = false;
            document.getElementById('micIcon').textContent = '🎤';
        };
        recognition.onerror = function() {
            recognizing = false;
            document.getElementById('micIcon').textContent = '🎤';
        };
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            handleChat();
        };

        micBtn.addEventListener('click', function() {
            if (recognizing) {
                recognition.stop();
                return;
            }
            recognition.start();
        });
    } else {
        micBtn.disabled = true;
        micBtn.title = 'Speech recognition not supported';
    }
});

// Chatbot message styles (add to CSS for better look)
// .chatbot-user { text-align: right; margin: 4px 0; color: var(--primary); }
// .chatbot-ai { text-align: left; margin: 4px 0; color: var(--accent); }
