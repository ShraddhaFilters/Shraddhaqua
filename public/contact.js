
const btn = document.querySelector('input[type="submit"]');
if (!btn) {
  console.error("Submit button not found");
}




btn.addEventListener('click', async (e) => {
  e.preventDefault();
  const name = document.querySelector('input[type="text"]').value;
const email = document.querySelector('input[type="email"]').value;
const phone = document.querySelector('input[type="tel"]').value;
const description = document.getElementById("msg").value;

function clr(){
    document.querySelector('input[type="text"]').value = "";
    document.querySelector('input[type="email"]').value ="";
    document.querySelector('input[type="tel"]').value = '';
    document.getElementById("msg").value = '';
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
    text: `# New Contact MSG \n ================= \n From: ${name} \n Email: ${email} \n Phone: ${phone} \n Message: ${description}`,
    parse_mode: 'Markdown',
    disable_web_page_preview: false,
    disable_notification: false,
    reply_to_message_id: 0,
    chat_id: '-1002682342161'
  })
};

fetch('https://api.telegram.org/bot7896065221%3AAAENT8Q1vDuYaR-jEhAoWCJb4gQEYPQj8Po/sendMessage', options)
  .then(res => res.json())
  .then(res => clr())
  .catch(err => console.error(err));
  } catch (error){
    alert(error.message)
  }

}
);

    
