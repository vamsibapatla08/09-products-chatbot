// Main function to initialize the chat interface
function initChat() {
  
  // Get all required DOM elements
  const chatToggle = document.getElementById('chatToggle');
  const chatBox = document.getElementById('chatBox');
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const sendMessageButton = document.getElementById('sendMessage');
  const chatMessages = document.getElementById('chatMessages');
  const openIcon = document.querySelector('.open-icon');
  const closeIcon = document.querySelector('.close-icon');
  let rentalsData = [];

  // Store the conversation so each request includes full chat history.
  const conversationHistory = [
    {
      role: 'assistant',
      content: 'Hi! I can help you find the perfect offbeat retreat. First question: what kind of vibe do you want?'
    }
  ];

  // Toggle chat visibility and swap icons
  chatToggle.addEventListener('click', function () {
    chatBox.classList.toggle('active');
    openIcon.style.display = chatBox.classList.contains('active') ? 'none' : 'block';
    closeIcon.style.display = chatBox.classList.contains('active') ? 'block' : 'none';
  });

  // Add one message to the chat window.
  function addMessageToChat(role, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role === 'user' ? 'user' : 'bot');
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Clean up formatting so chatbot messages stay easy to scan.
  function formatAssistantMessage(content) {
    return content
      .replace(/\r\n/g, '\n')
      .trim()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*(\d+)[)\-]\s+/gm, '$1. ');
  }

  // Load rental data from rentals.json so the AI can make recommendations.
  async function loadRentalsData() {
    if (rentalsData.length > 0) {
      return;
    }

    const response = await fetch('./rentals.json');
    if (!response.ok) {
      throw new Error('Could not load rental data.');
    }

    const data = await response.json();
    rentalsData = data.rentals || [];
  }

  // Send the full conversation to OpenAI and return the assistant's text reply.
  async function getAssistantReply() {
    await loadRentalsData();

    const systemMessages = [
      {
        role: 'system',
        content: 'You are Offbeat Assistant. Use only the provided rental data. Guide the user through a short matching conversation by asking 2-3 simple questions total about their preferences (for example: vibe, location, and rating). Ask natural, beginner-friendly questions and keep them short. If you still need details, ask the next best question instead of recommending yet. Once you have enough answers, stop asking questions and recommend the top 2-3 rentals that best match the user. For each recommendation, clearly explain why it matches the user\'s answers. Keep every response clear and ordered with this structure:\n1) One short intro line\n2) Either one question OR a "Top Matches" section\n3) If listing matches, use numbered items 1., 2., 3. with 1-2 bullet points each.\nUse line breaks between sections. Keep the tone warm, conversational, and concise.'
      },
      {
        role: 'system',
        content: `Rental data: ${JSON.stringify(rentalsData)}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [...systemMessages, ...conversationHistory],
        temperature: 0.85
      })
    });

    if (!response.ok) {
      throw new Error('Request failed. Check your API key and network connection.');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Handle user input and process messages.
  async function handleUserInput(e) {
    e.preventDefault();
    const message = userInput.value.trim();

    if (!message) {
      return;
    }

    if (!apiKey || apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      addMessageToChat('assistant', 'Please add your OpenAI API key in js/secrets.js first.');
      return;
    }

    userInput.value = '';
    addMessageToChat('user', message);
    conversationHistory.push({ role: 'user', content: message });

    sendMessageButton.disabled = true;

    try {
      const assistantReply = await getAssistantReply();
      const formattedAssistantReply = formatAssistantMessage(assistantReply);
      addMessageToChat('assistant', formattedAssistantReply);
      conversationHistory.push({ role: 'assistant', content: formattedAssistantReply });
    } catch (error) {
      addMessageToChat('assistant', 'Sorry, something went wrong while contacting OpenAI.');
      console.error(error);
    } finally {
      sendMessageButton.disabled = false;
    }
  }

  // Listen for form submission
  chatForm.addEventListener('submit', handleUserInput);
}

// Initialize the chat interface
initChat();
