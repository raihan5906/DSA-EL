let recentSearches = [];

window.onload = function() {
    fetch('/history')
        .then(res => res.json())
        .then(data => {
            recentSearches = data;
            renderSidebar();
        });
};

function renderSidebar() {
    const listEl = document.getElementById('recent-list');
    if (!listEl) return;
    // The sidebar now populates with items that will be styled as sections in CSS
    listEl.innerHTML = recentSearches.map(q => 
        `<li onclick="document.getElementById('q').value='${q}'; search();">${q}</li>`
    ).join('');
}

function updateSidebar(query) {
    recentSearches = recentSearches.filter(item => item.toLowerCase() !== query.toLowerCase());
    recentSearches.unshift(query);
    if (recentSearches.length > 10) recentSearches.pop();
    renderSidebar();
}

function search() {
    const q = document.getElementById("q").value;
    const btnText = document.getElementById("btn-text");
    const spinner = document.getElementById("spinner");
    const askBtn = document.getElementById("ask-btn");
    const resDiv = document.getElementById("result");

    if(!q) return;

    btnText.style.display = 'none';
    spinner.classList.remove('hidden');
    askBtn.disabled = true;
    resDiv.innerHTML = "<div class='result-card'>Searching...</div>";

    fetch(`/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
            btnText.style.display = 'inline';
            spinner.classList.add('hidden');
            askBtn.disabled = false;

            updateSidebar(data.query);

            const htmlContent = marked.parse(data.answer);
            // FIXED: Removed <h2>${data.query}</h2> so the query is no longer printed in the result
            resDiv.innerHTML = `
                <div class="result-card">
                    <div class="ai-content">${htmlContent}</div>
                </div>`;
        })
        .catch(() => {
            btnText.style.display = 'inline';
            spinner.classList.add('hidden');
            askBtn.disabled = false;
            resDiv.innerHTML = "<div class='result-card'>Connection Error.</div>";
        });
}

function getSuggestions() {
    const query = document.getElementById('q').value;
    const suggestDiv = document.getElementById('suggestions');
    if (query.length < 2) { suggestDiv.innerHTML = ''; return; }

    fetch(`/suggest?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(list => {
            suggestDiv.innerHTML = list.map(item => 
                `<div class="s-item" onclick="selectSuggest('${item}')">${item}</div>`
            ).join('');
        });
}

function selectSuggest(val) {
    document.getElementById('q').value = val;
    document.getElementById('suggestions').innerHTML = '';
    search();
}