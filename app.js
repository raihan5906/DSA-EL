document.getElementById('q').addEventListener('input', function() {
    const query = this.value;
    const suggestDiv = document.getElementById('suggestions');
    if (query.length < 2) { suggestDiv.innerHTML = ''; return; }

    fetch(`/suggest?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(list => {
            suggestDiv.innerHTML = list.map(item => 
                `<div class="s-item" onclick="selectSuggest('${item}')">${item}</div>`
            ).join('');
        });
});

function selectSuggest(val) {
    document.getElementById('q').value = val;
    document.getElementById('suggestions').innerHTML = '';
    search();
}

function search() {
    const q = document.getElementById("q").value;
    const resDiv = document.getElementById("result");
    if(!q) return;

    resDiv.innerHTML = "<div style='text-align:center;'>Searching...</div>";

    fetch(`/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
            let text = data.answer;

            // Aggressive symbol removal
            text = text.replace(/^#+\s+(.*$)/gim, '<h3 class="section-head">$1</h3>');
            text = text.replace(/^[-*]{3,}$/gm, '<hr class="section-divider">');
            text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
            text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            text = text.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li>$1</li>');
            text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
            text = text.replace(/\n/g, '<br>');

            resDiv.innerHTML = `<div class="result-card"><h2>${data.query}</h2><div class="ai-content">${text}</div></div>`;
        });
}