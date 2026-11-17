const chatForm   = document.getElementById("chatForm");
const userInput  = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const sendBtn    = document.getElementById("sendBtn");

// riwayat percakapan (sesuai format OpenRouter)
const history = [];

// --- Helper: tambah bubble ---
function addMessage(role, text = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
    return bubble; // biar bisa di-append saat streaming
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Helper: indikator typing ---
function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "message bot";
    wrapper.id = "typing";
    wrapper.innerHTML = `
        <div class="bubble typing">
            <span></span><span></span><span></span>
        </div>`;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

function hideTyping() {
    document.getElementById("typing")?.remove();
}

// --- Kirim pesan ---
async function sendMessage(text) {
    // tambah bubble user
    addMessage("user", text);
    history.push({ role: "user", content: text });

    // disable input sementara
    userInput.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    let botBubble = null;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: history })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Gagal menghubungi server");
        }

        hideTyping();
        botBubble = addMessage("bot", "");

        // --- Streaming SSE ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;

                const data = trimmed.replace(/^data:\s*/, "");
                if (data === "[DONE]") continue;

                try {
                    const content = JSON.parse(data);
                    if (content) {
                        fullText += content;
                        botBubble.textContent = fullText;
                        scrollToBottom();
                    }
                } catch {
                    // skip parsing error
                }
            }
        }

        // simpan ke history
        history.push({ role: "assistant", content: fullText });

    } catch (err) {
        hideTyping();
        console.error(err);
        if (!botBubble) botBubble = addMessage("bot", "");
        botBubble.textContent = "⚠️ Maaf, terjadi kesalahan: " + err.message;
        scrollToBottom();
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// --- Event submit ---
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = "";
    sendMessage(text);
});