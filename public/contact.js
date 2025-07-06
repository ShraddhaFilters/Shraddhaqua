const btn = document.querySelector('input[type="submit"]');

if (btn) {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.querySelector('input[type="email"]').value;
    const phone = document.querySelector('input[type="tel"]').value;
    const description = document.getElementById("msg").value;

    function clr() {
      document.querySelector('input[type="text"]').value = "";
      document.querySelector('input[type="email"]').value = "";
      document.querySelector('input[type="tel"]').value = "";
      document.getElementById("msg").value = "";
    }

    if (!name || !email || !phone || !description) {
      alert("All fields are required.");
      return;
    }

    try {
      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'User-Agent': 'Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          text: `# New Contact MSG \n================= \nFrom: ${name} \nEmail: ${email} \nPhone: ${phone} \nMessage: ${description}`,
          parse_mode: 'Markdown',
          chat_id: '-1002682342161'
        })
      };

      const res = await fetch('https://api.telegram.org/bot7896065221:AAENT8Q1vDuYaR-jEhAoWCJb4gQEYPQj8Po/sendMessage', options);
      const data = await res.json();

      if (res.ok && data.ok) {
        clr();
        alert("Message sent!");
      } else {
        throw new Error("Telegram API error");
      }
    } catch (error) {
      alert("Error sending message: " + error.message);
    }
  });
} else {
  console.error("Submit button not found");
}
