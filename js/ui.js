// --- GLOBAL VARIABLES (PASTE AT VERY TOP OF FILE) ---
var currentQuiz = {};
var qIndex = 0;
var userAnswers = []; // Add this with your other variables
var score = 0;
var flashcards = [];
var fcIndex = 0;
import { generateQuizAI, extractTextFromPDF, generateFlashcardsAI } from './ai.js';

// --- ROUTER (Switch Views) ---
window.router = (viewName) => {
    // 1. Hide all sections
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    
    // 2. Show target section
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error(`View "view-${viewName}" not found!`);
        return;
    }
    
    // 3. Update Sidebar Active State
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === viewName) {
            btn.classList.remove('text-gray-400', 'bg-transparent');
            btn.classList.add('text-white', 'bg-white/10');
        } else {
            btn.classList.add('text-gray-400');
            btn.classList.remove('text-white', 'bg-white/10');
        }
    });
};

// --- PDF UPLOAD LOGIC ---
// We attach contextText to window so flashcards can see it too
window.contextText = ""; 
const fileInput = document.getElementById('pdf-upload');

if(fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const zone = document.getElementById('drop-zone');
        const originalContent = zone.innerHTML;
        zone.innerHTML = `<div class="animate-spin h-8 w-8 border-2 border-purple-500 rounded-full border-t-transparent mx-auto"></div>`;

        try {
            window.contextText = await extractTextFromPDF(file);
            zone.innerHTML = `
                <div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ion-icon name="checkmark" class="text-green-400 text-xl"></ion-icon>
                </div>
                <p class="text-white font-bold">${file.name}</p>
                <p class="text-xs text-green-400">PDF Ready</p>
            `;
        } catch(err) {
            console.error(err);
            zone.innerHTML = originalContent;
            alert("Error reading PDF");
        }
    });
}

// --- QUIZ GENERATION ---
window.generateQuiz = async () => {
    const userText = document.getElementById('ai-prompt').value;
    const finalText = (window.contextText || "") + "\n" + userText;
    
    if(finalText.length < 10) return alert("Please upload a PDF or enter text!");

    // --- NEW: CALL THE LIVING LOADER ---
    await showLivingLoader("Generating Quiz"); 
    // -----------------------------------

    try {
        const quiz = await generateQuizAI(finalText);
        startQuiz(quiz);
    } catch(err) {
        console.error(err);
    }
};

// --- GLOBAL VARIABLES (Check these are at top of file) ---
// If you already have them at the top, you don't need to paste them again.
// let currentQuiz = {};
// let qIndex = 0;
// let score = 0;

// --- 1. START QUIZ ---
window.startQuiz = (quiz) => {
    console.log("Starting Quiz...", quiz);
    if (!quiz || !quiz.questions) {
        alert("Starting quiz");
        return;
    }

    currentQuiz = quiz;
    qIndex = 0; // Force Reset
    score = 0;
    userAnswers = [];
    // Switch to Quiz View
    router('quiz');
    
    // Draw Q1
    renderQuestion();
};

// --- 2. RENDER QUESTION ---
window.renderQuestion = () => {
    console.log("Rendering Question Index:", qIndex);
    
    const q = currentQuiz.questions[qIndex];
    if(!q) {
        console.error("Error: Question undefined for index", qIndex);
        return;
    }

    // Update Text
    const textEl = document.getElementById('question-text');
    if(textEl) textEl.innerText = q.q;

    // Update Progress
    const progressEl = document.getElementById('quiz-progress');
    if(progressEl) {
        const percent = ((qIndex) / currentQuiz.questions.length) * 100;
        progressEl.style.width = `${percent}%`;
    }

    // Create Buttons
    const container = document.getElementById('options-container');
    container.innerHTML = ''; // Clear old buttons

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-5 rounded-xl border border-white/10 hover:border-brand-purple hover:bg-white/5 transition flex items-center gap-4 group";
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-sm text-gray-400 group-hover:border-brand-purple group-hover:text-brand-purple transition">
                <ion-icon name="radio-button-off"></ion-icon>
            </div>
            <span class="text-gray-200 font-medium">${opt}</span>
        `;
        
        // CLICK EVENT
        btn.onclick = () => handleAnswer(btn, opt, q.answer);
        
        container.appendChild(btn);
    });
};

// --- 3. HANDLE ANSWER ---
window.handleAnswer = (btn, selected, correct) => {
    // 1. Save the User's Choice for Review later
    const currentQ = currentQuiz.questions[qIndex];
    userAnswers.push({
        question: currentQ.q,
        selected: selected,
        correct: correct,
        isCorrect: (selected === correct)
    });

    // 2. Disable buttons
    const allBtns = document.querySelectorAll('#options-container button');
    allBtns.forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-50');
    });
    btn.classList.remove('opacity-50');

    // 3. Scoring & Coloring
    if (selected === correct) {
        btn.classList.add('bg-green-500/20', 'border-green-500', 'text-green-400');
        score++;
    } else {
        btn.classList.add('bg-red-500/20', 'border-red-500', 'text-red-400');
        // Highlight correct one
        allBtns.forEach(b => {
            if(b.innerText.includes(correct)) {
                b.classList.remove('opacity-50');
                b.classList.add('bg-green-500/20', 'border-green-500');
            }
        });
    }

    // 4. Move Next
    setTimeout(() => {
        if (qIndex < currentQuiz.questions.length - 1) {
            qIndex++;
            renderQuestion();
        } else {
            showResults();
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            router('leaderboard');
        }
    }, 1500);
};



// --- FORCE C PROGRAMMING FLASHCARDS ---
window.generateFlashcards = async () => {
    const userText = document.getElementById('ai-prompt').value;
    const finalText = (window.contextText || "") + "\n" + userText;

    if(finalText.length < 5) return alert("Please enter text or upload a PDF first!");

    const btn = document.getElementById('flash-btn');
    const originalHTML = btn.innerHTML;
    
    // 1. Show Spinner
    btn.innerHTML = `<div class="animate-spin h-5 w-5 border-2 border-purple-300 rounded-full border-t-transparent"></div> Creating...`;

    // 2. FAKE DELAY (Simulate AI thinking)
    setTimeout(() => {
        
        // 3. HARDCODED DATA (The C Programming Set)
        const demoData = {
            flashcards: [
                { 
                    term: "Segmentation Fault", 
                    def: "A specific error caused by accessing memory that does not belong to you." 
                },
                { 
                    term: "Memory Leak", 
                    def: "Occurs when memory is allocated in the heap but never freed/deleted." 
                },
                { 
                    term: "Dangling Pointer", 
                    def: "A pointer that points to a memory location that has already been freed." 
                },
                { 
                    term: "Recursion", 
                    def: "A process where a function calls itself directly or indirectly." 
                },
                { 
                    term: "Structure (struct)", 
                    def: "A user-defined data type that groups variables of different types." 
                }
            ]
        };
// --- PASTE THIS DIRECTLY BELOW window.generateFlashcards ---

function startFlashcards(data) {
    // 1. Take the hardcoded data and save it globally
    flashcards = data.flashcards; 
    
    // 2. Reset to the first card
    fcIndex = 0;
    
    // 3. Switch the screen to "Flashcards View"
    router('flashcards'); 
    
    // 4. Draw the first card
    renderCard();
}
        // 4. LOAD IT
        startFlashcards(demoData);
        
        
        // Reset button
        btn.innerHTML = originalHTML;

    }, 1500); // 1.5 second wait
};

window.nextCard = () => {
    if (fcIndex < flashcards.length - 1) {
        fcIndex++;
        renderCard();
    }
};

window.prevCard = () => {
    if (fcIndex > 0) {
        fcIndex--;
        renderCard();
    }
};
// --- ANALYTICS CHART LOGIC ---

function initChart() {
    const ctx = document.getElementById('performanceChart');
    if(!ctx) return; // Safety check

    // Destroy old chart if exists (prevent duplicates)
    if(window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Quiz Score (%)',
                data: [65, 72, 68, 85, 82, 90, 88], // Dummy data for demo
                borderColor: '#7C3AED', // Brand Purple
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.5)'); // Purple top
                    gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)'); // Transparent bottom
                    return gradient;
                },
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#7C3AED',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF' }
                }
            }
        }
    });
}

// AUTO-LOAD CHART ON DASHBOARD
// Add this to your existing router function or call it when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for layout to settle
    setTimeout(initChart, 500);
});

// Also trigger it when clicking "Dashboard" in sidebar
const dashboardBtn = document.querySelector('button[data-target="dashboard"]');
if(dashboardBtn) {
    dashboardBtn.addEventListener('click', () => setTimeout(initChart, 100));
}
// --- EXPLORE PAGE LOGIC ---
window.startDemoQuiz = async (topicName) => {
    
    // --- NEW: CALL THE LIVING LOADER ---
    await showLivingLoader(`Loading ${topicName}`);
    // -----------------------------------

    try {
        const quiz = await generateQuizAI("DEMO_TRIGGER"); 
        quiz.title = topicName; 
        startQuiz(quiz);
    } catch(e) {
        console.error(e);
    }
};
// --- AUDIO LEARN / TEXT-TO-SPEECH ---

window.readCurrentCard = () => {
    // 1. Check if browser supports speech
    if (!('speechSynthesis' in window)) {
        alert("Sorry, your browser doesn't support Text-to-Speech.");
        return;
    }

    // 2. Stop any current speaking
    window.speechSynthesis.cancel();

    // 3. Get the text based on which side is showing
    const cardElement = document.getElementById('flashcard');
    const isFlipped = cardElement.classList.contains('flipped');
    
    // If flipped (Back), read the answer. If not flipped (Front), read the question.
    // Note: We access the global 'flashcards' and 'fcIndex' variables we created earlier.
    const currentCard = flashcards[fcIndex];
    const textToRead = isFlipped ? currentCard.back : currentCard.front;

    // 4. Create the Utterance
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Optional: Select a better voice (tries to find a "Google" or "English" voice)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.name.includes("Google US English")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    // 5. Speak
    utterance.rate = 1; // Normal speed
    utterance.pitch = 1; // Normal pitch
    window.speechSynthesis.speak(utterance);

    // Visual Feedback (Button Animation)
    const btn = document.querySelector('button[onclick="readCurrentCard()"] ion-icon');
    if(btn) {
        btn.setAttribute("name", "volume-high");
        btn.classList.add("animate-pulse");
        
        utterance.onend = () => {
            btn.classList.remove("animate-pulse");
        };
    }
};

// Bonus: Auto-stop audio when leaving the page or flipping card
document.getElementById('flashcard').addEventListener('click', () => {
    window.speechSynthesis.cancel();
});
// --- AI GURU CHATBOT LOGIC ---

window.toggleChat = () => {
    const chat = document.getElementById('chat-window');
    chat.classList.toggle('open');
    // Focus input when opened
    if (chat.classList.contains('open')) {
        setTimeout(() => document.getElementById('chat-input').focus(), 300);
    }
};

window.handleChatEnter = (e) => {
    if (e.key === 'Enter') sendChatMessage();
};

// --- SMART AI CHAT (Scripted for Demo) ---
window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // 1. Add User Message
    addMessage(text, 'user');
    input.value = '';

    // 2. Show Typing Indicator
    const typingId = addTypingIndicator();

    // 3. Simulate AI "Thinking" Delay
    await new Promise(r => setTimeout(r, 1500));

    // 4. Generate Response (SMART KEYWORD LOGIC)
    removeMessage(typingId);
    
    const lowerText = text.toLowerCase();
    let finalResponse = "";

    // --- CHECK FOR SPECIFIC KEYWORDS ---
    if (lowerText.includes("array")) {
        finalResponse = "In C, an Array is a fixed-size collection of elements of the same data type stored in contiguous memory locations. It allows you to store multiple values in a single variable.";
    } 
    else if (lowerText.includes("pointer")) {
        finalResponse = "A Pointer is a powerful feature in C. It is a variable that stores the memory address of another variable, allowing direct memory manipulation.";
    }
    else if (lowerText.includes("struct")) {
        finalResponse = "A Structure (struct) is a user-defined data type that allows you to group variables of different types under a single name.";
    }
    else if (lowerText.includes("recursion")) {
        finalResponse = "Recursion occurs when a function calls itself. It needs a 'base case' to stop, otherwise it causes a Stack Overflow.";
    }
    else if (lowerText.includes("hello") || lowerText.includes("hi")) {
        finalResponse = "Hello! I have analyzed your PDF on C Programming. What topic would you like to review?";
    }
    else {
        // --- FALLBACK GENERIC RESPONSES ---
        const responses = [
            "Based on the notes you uploaded, that concept is crucial for memory management.",
            "That's a great question. The text highlights this as a key factor in optimization.",
            "From the C Programming context, this syntax is strictly enforced by the compiler.",
            "According to the documentation, you should check your syntax for missing semicolons.",
            "The logic seems correct, but ensure you aren't accessing out-of-bounds memory."
        ];
        finalResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    addMessage(finalResponse, 'ai');
};
function addMessage(text, sender) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    
    if (sender === 'user') {
        div.className = 'msg-user fade-in';
        div.innerText = text;
    } else {
        div.className = 'flex gap-2 fade-in';
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0 mt-1"><ion-icon name="sparkles"></ion-icon></div>
            <div class="msg-ai">${text}</div>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight; // Auto scroll to bottom
}

function addTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex gap-2 fade-in';
    div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0 mt-1"><ion-icon name="sparkles"></ion-icon></div>
        <div class="msg-ai flex items-center gap-1 h-10">
            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}
// --- PRO CONTROLS: KEYBOARD SHORTCUTS ---

document.addEventListener('keydown', (e) => {
    // 1. Identify which view is active
    const isFlashcards = !document.getElementById('view-flashcards').classList.contains('hidden');
    const isQuiz = !document.getElementById('view-quiz').classList.contains('hidden');
    const isChatOpen = document.getElementById('chat-window').classList.contains('open');

    // 2. GLOBAL: Escape Key closes things
    if (e.key === 'Escape') {
        if (isChatOpen) toggleChat();
        // If in a sub-view, go back to dashboard
        if (isFlashcards || isQuiz) router('dashboard');
    }

    // 3. FLASHCARD SHORTCUTS
    if (isFlashcards) {
        if (e.code === 'Space') {
            e.preventDefault(); // Stop page scrolling
            document.getElementById('flashcard').classList.toggle('flipped');
        }
        if (e.key === 'ArrowRight') nextCard();
        if (e.key === 'ArrowLeft') prevCard();
        if (e.key === 'r' || e.key === 'R') readCurrentCard(); // Press 'R' to read audio
    }

    // 4. QUIZ SHORTCUTS (A, B, C, D to answer)
    if (isQuiz) {
        // Only works if options are standard
        const options = document.getElementById('options-container').querySelectorAll('button');
        if (e.key === '1' && options[0]) options[0].click();
        if (e.key === '2' && options[1]) options[1].click();
        if (e.key === '3' && options[2]) options[2].click();
        if (e.key === '4' && options[3]) options[3].click();
    }
});
// --- SCRATCHPAD LOGIC ---

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
let painting = false;

// Resize canvas to fit screen
function resizeCanvas() {
    canvas.width = document.getElementById('canvas-container').clientWidth;
    canvas.height = document.getElementById('canvas-container').clientHeight;
    // Default styling
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
}

window.toggleScratchpad = () => {
    const el = document.getElementById('scratchpad-overlay');
    el.classList.toggle('hidden');
    
    if (!el.classList.contains('hidden')) {
        // Initialize canvas when opened
        resizeCanvas();
    }
};

window.setPenColor = (color) => {
    ctx.strokeStyle = color;
};

window.clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// DRAWING EVENTS
function startPosition(e) {
    painting = true;
    draw(e);
}

function endPosition() {
    painting = false;
    ctx.beginPath(); // Reset path so lines don't connect
}

function draw(e) {
    if (!painting) return;

    // Calculate position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Event Listeners for Mouse
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);

// Event Listeners for Touch (Mobile support)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Stop scrolling
    startPosition(e.touches[0]);
});
canvas.addEventListener('touchend', endPosition);
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e.touches[0]);
});

// Window resize handling
window.addEventListener('resize', () => {
    if (!document.getElementById('scratchpad-overlay').classList.contains('hidden')) {
        resizeCanvas();
    }
});
// --- EXPORT TO PDF LOGIC ---

window.downloadPDF = () => {
    // 1. Check if we have a quiz
    if (!currentQuiz) return alert("No quiz to download!");

    // 2. Create a "Clean" printable structure in memory
    // We do this so we don't print the dark mode UI/Buttons
    const container = document.createElement('div');
    container.style.padding = '40px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = 'black';
    container.style.background = 'white';

    // Header
    const date = new Date().toLocaleDateString();
    container.innerHTML += `
        <div style="border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between;">
            <div>
                <h1 style="margin: 0; color: #7C3AED;">${currentQuiz.title || "EduQuiz AI Generated"}</h1>
                <p style="margin: 5px 0 0 0; color: #666;">AI-Generated Worksheet</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-weight: bold;">Date: ${date}</p>
                <p style="margin: 0;">Score: ____ / ${currentQuiz.questions.length}</p>
            </div>
        </div>
    `;

    // Questions
    currentQuiz.questions.forEach((q, index) => {
        let optionsHTML = '';
        q.options.forEach(opt => {
            optionsHTML += `
                <div style="margin: 8px 0; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 15px; height: 15px; border: 1px solid black; border-radius: 50%;"></div>
                    <span>${opt}</span>
                </div>
            `;
        });

        container.innerHTML += `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="margin-bottom: 10px;">${index + 1}. ${q.q}</h3>
                <div style="margin-left: 20px;">${optionsHTML}</div>
            </div>
        `;
    });

    // Footer
    container.innerHTML += `
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
            Generated by EduQuiz AI • The Future of Learning
        </div>
    `;

    // 3. Generate PDF
    // We trick html2pdf to use this off-screen element
    const opt = {
        margin:       0.5,
        filename:     'EduQuiz_Worksheet.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Show a toast/alert
    const btn = document.querySelector('button[onclick="downloadPDF()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<ion-icon name="time"></ion-icon> Saving...`;

    html2pdf().set(opt).from(container).save().then(() => {
        btn.innerHTML = originalText;
        // Optional: Celebration
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    });
};
// --- 3D WORD CLOUD INITIALIZATION ---

function initWordCloud() {
    try {
        TagCanvas.Start('topic-cloud-canvas', 'topic-tags', {
            textColour: '#ffffff',     // White text
            outlineColour: '#7C3AED',  // Your Brand Purple for the glow effect
            outlineMethod: 'colour',   // Use color outline instead of block
            reverse: true,             // Spins opposite to mouse movement (feels more natural)
            depth: 0.8,                // How "deep" the 3D effect looks
            maxSpeed: 0.05,            // Speed of rotation
            minSpeed: 0.01,
            textFont: 'Outfit, sans-serif', // Match your site font
            weightMode: 'size',        // Use the font-sizes defined in the HTML list
            wheelZoom: false,          // Disable zooming with mouse wheel
            fadeIn: 1000,              // Fade in effect on load
            shadow: '#cc99ff',         // Subtle purple shadow
            shadowBlur: 3,
            initial: [0.1, -0.1]       // Initial slow spin direction
        });
    } catch(e) {
        // Fallback if canvas isn't supported (rare nowadays)
        console.log("Canvas error: ", e);
        document.getElementById('topic-cloud-canvas').style.display = 'none';
        // You could show a simple list here as a backup if you wanted
    }
}

// Start the cloud when the page finishes loading
window.addEventListener('load', function() {
    // We wrap it in a slight delay to ensure elements are rendered
    setTimeout(initWordCloud, 500);
});

// Optional: Resize cloud if window changes size to keep it centered
let resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Reload TagCanvas to adjust to new container size
        TagCanvas.Delete('topic-cloud-canvas');
        initWordCloud();
    }, 250);
});
// --- LIVING LOADER LOGIC ---

window.showLivingLoader = async (taskName = "Generating") => {
    // 1. Create the Overlay
    const loader = document.createElement('div');
    loader.id = 'living-loader';
    loader.className = "fixed inset-0 z-[100] flex flex-col items-center justify-center fade-in";
    
    loader.innerHTML = `
        <div class="relative mb-8">
            <div class="w-24 h-24 bg-brand-purple rounded-3xl flex items-center justify-center loader-pulse relative z-10">
                <ion-icon name="sparkles" class="text-5xl text-white"></ion-icon>
            </div>
            <div class="absolute inset-0 bg-purple-500 blur-2xl opacity-50"></div>
        </div>

        <h2 id="loader-msg" class="text-3xl md:text-4xl loader-text mb-4 text-center">Initializing AI...</h2>
        
        <div class="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div id="loader-bar" class="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-0 transition-all duration-300 ease-out"></div>
        </div>
        
        <p class="text-gray-500 text-sm mt-4 font-mono">Process ID: <span id="proc-id">8492</span></p>
    `;
    
    document.body.appendChild(loader);

    // 2. The "Script" of messages to show
    const messages = [
        "Analyzing content structure...",
        "Identifying key concepts...",
        "Connecting to Neural Network...",
        "Drafting difficult questions...",
        "Reviewing answers for accuracy...",
        "Finalizing quiz assets..."
    ];

    // 3. Cycle through messages
    const totalTime = 3000; // 3 seconds total wait
    const stepTime = totalTime / messages.length;
    
    for (let i = 0; i < messages.length; i++) {
        // Update Text
        document.getElementById('loader-msg').innerText = messages[i];
        
        // Update Progress Bar
        const percentage = ((i + 1) / messages.length) * 100;
        document.getElementById('loader-bar').style.width = `${percentage}%`;
        
        // Random "Process ID" flicker for tech effect
        document.getElementById('proc-id').innerText = Math.floor(Math.random() * 9000) + 1000;

        // Wait
        await new Promise(r => setTimeout(r, stepTime));
    }

    // 4. Cleanup
    loader.classList.add('opacity-0'); // Fade out
    setTimeout(() => loader.remove(), 500);
};
// --- LOGOUT LOGIC ---
window.logout = () => {
    if(confirm("Are you sure you want to log out?")) {
        // Optional: Clear any stored data
        // localStorage.clear();
        
        // Redirect to Auth Page
        window.location.href = 'auth.html';
    }
};
// --- STUDENT JOIN LOGIC (DEBUG VERSION) ---
window.joinClass = async () => {
    console.log("Join button clicked!"); // Check console for this

    const input = document.getElementById('join-code-input');
    if (!input) {
        alert("Error: Could not find the input box (id='join-code-input'). Check your HTML.");
        return;
    }

    const code = input.value.trim();
    console.log("Code entered:", code);

    // 1. Validation
    if(code.length < 6) {
        alert("Please enter a valid 6-digit code (e.g., 882 104).");
        return;
    }

    // 2. Simulation Effect
    if (typeof showLivingLoader === "function") {
        await showLivingLoader("Connecting to Room " + code);
    } else {
        // Fallback if loader is missing
        alert("Connecting...");
    }

    // 3. Success Logic
    setTimeout(() => {
        // Use the Demo Quiz trigger
        if (typeof startDemoQuiz === "function") {
            startDemoQuiz("Physics Live");
        } else {
            alert("Success! Joined Room: " + code);
        }
    }, 2000);
};// --- EMERGENCY DEMO RESET ---
// Type 'resetApp()' in the browser console (F12) to fix everything instantly.
window.resetApp = () => {
    localStorage.clear();
    location.reload();
};
// --- RENDER CARD FUNCTION (Paste at the bottom of ui.js) ---
window.renderCard = () => {
    // 1. Safety Check
    if (!flashcards || flashcards.length === 0) return;

    // 2. Get current card data
    const card = flashcards[fcIndex];

    // 3. Find the HTML elements (Using the IDs from your design)
    const frontEl = document.getElementById('fc-front');
    const backEl = document.getElementById('fc-back');
    const cardWrapper = document.getElementById('flashcard');

    // 4. Update the text
    if (frontEl) frontEl.innerText = card.term;
    if (backEl) backEl.innerText = card.def;

    // 5. Reset flip state so it shows the front first
    if (cardWrapper) cardWrapper.classList.remove('flipped');
    
    console.log("Card Rendered:", card.term);
};
// --- CALCULATE AND SHOW RESULTS ---
// --- SHOW RESULTS & AUTO-GENERATE ANALYSIS ---
window.showResults = () => {
    // 1. Calculate Stats
    const total = currentQuiz.questions.length;
    const correct = score;
    const wrong = total - score;
    const percentage = Math.round((correct / total) * 100);

    // 2. Update Left Panel (Stats)
    const pScore = document.getElementById('result-correct');
    const pWrong = document.getElementById('result-wrong');
    const pPercent = document.getElementById('result-percent');

    if (pScore) pScore.innerText = correct + "/" + total;
    if (pWrong) pWrong.innerText = wrong;
    if (pPercent) {
        pPercent.innerText = percentage + "%";
        // Color Coding
        if(percentage >= 80) pPercent.className = "text-3xl font-bold text-green-400";
        else if(percentage >= 50) pPercent.className = "text-3xl font-bold text-yellow-400";
        else pPercent.className = "text-3xl font-bold text-red-400";
    }

    // 3. AUTO-GENERATE RIGHT PANEL (Analysis List)
    const container = document.getElementById('review-container');
    if (container) {
        container.innerHTML = ''; // Clear old data
        
        userAnswers.forEach((item, index) => {
            const isCorrect = item.isCorrect;
            const borderClass = isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5';
            const icon = isCorrect ? 'checkmark-circle' : 'close-circle';
            const iconColor = isCorrect ? 'text-green-400' : 'text-red-400';

            container.innerHTML += `
                <div class="p-4 rounded-xl border ${borderClass} flex gap-4 items-start animate-fade-in group hover:bg-white/5 transition">
                    <div class="mt-1">
                        <ion-icon name="${icon}" class="text-2xl ${iconColor}"></ion-icon>
                    </div>
                    <div class="w-full">
                        <div class="flex justify-between items-start">
                            <h4 class="text-gray-200 font-medium text-sm mb-2 leading-relaxed">
                                <span class="text-white/40 font-bold mr-2">Q${index + 1}</span> ${item.question}
                            </h4>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-2 mt-2 text-xs bg-black/20 p-3 rounded-lg">
                            ${!isCorrect ? `
                                <div class="flex items-center gap-2 text-red-300">
                                    <ion-icon name="close"></ion-icon>
                                    <span class="font-bold opacity-70">YOU CHOSE:</span> ${item.selected}
                                </div>
                            ` : ''}
                            <div class="flex items-center gap-2 text-green-300">
                                <ion-icon name="checkmark"></ion-icon>
                                <span class="font-bold opacity-70">CORRECT:</span> ${item.correct}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
};
// --- TOGGLE & RENDER REVIEW LIST ---
window.toggleReview = () => {
    const section = document.getElementById('review-section');
    const container = document.getElementById('review-container');
    
    // Toggle Visibility
    section.classList.toggle('hidden');
    
    // If we are opening it, generate the list
    if (!section.classList.contains('hidden')) {
        container.innerHTML = ''; // Clear old data
        
        userAnswers.forEach((item, index) => {
            const isCorrect = item.isCorrect;
            
            // Choose Color: Green if correct, Red if wrong
            const borderClass = isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5';
            const icon = isCorrect ? 'checkmark-circle' : 'close-circle';
            const iconColor = isCorrect ? 'text-green-400' : 'text-red-400';

            container.innerHTML += `
                <div class="p-4 rounded-xl border ${borderClass} flex gap-4 items-start animate-fade-in">
                    <ion-icon name="${icon}" class="text-2xl ${iconColor} mt-1 shrink-0"></ion-icon>
                    <div class="w-full">
                        <p class="text-gray-300 font-medium text-sm mb-2">Q${index + 1}: ${item.question}</p>
                        
                        <div class="flex flex-col gap-1 text-xs">
                            ${!isCorrect ? `
                                <div class="flex items-center gap-2 text-red-400">
                                    <span class="font-bold uppercase">You Chose:</span> ${item.selected}
                                </div>
                            ` : ''}
                            <div class="flex items-center gap-2 text-green-400">
                                <span class="font-bold uppercase">Correct Answer:</span> ${item.correct}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Auto scroll to review section
        setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 100);
    }
};