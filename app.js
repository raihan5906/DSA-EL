let recentSearches = [];

window.onload = function() {
    fetch('/history')
        .then(res => res.json())
        .then(data => {
            recentSearches = data;
            renderSidebar();
        });

    document.addEventListener('click', function(e) {
        if (e.target && (e.target.classList.contains('copy-code-btn') || e.target.closest('.copy-code-btn'))) {
            const btn = e.target.classList.contains('copy-code-btn') ? e.target : e.target.closest('.copy-code-btn');
            const wrapper = btn.closest('.code-wrapper');
            const codeEl = wrapper.querySelector('code') || wrapper.querySelector('pre');
            const textToCopy = codeEl.innerText.trim();
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            }).catch(err => console.error('Clipboard Error:', err));
        }
    });
};

function renderSidebar() {
    const listEl = document.getElementById('recent-list');
    if (!listEl) return;
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
    
    // FIXED: Uses 'loading-state' class for borderless loading text
    resDiv.innerHTML = "<div class='result-card loading-state'><div class='ai-content'>Searching...</div></div>";

    fetch(`/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
            btnText.style.display = 'inline';
            spinner.classList.add('hidden');
            askBtn.disabled = false;
            updateSidebar(data.query);

            let htmlContent = marked.parse(data.answer);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            tempDiv.querySelectorAll('pre').forEach(pre => {
                const wrapper = document.createElement('div');
                wrapper.className = 'code-wrapper';
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
                wrapper.appendChild(copyBtn);
            });

            // FIXED: Standard result-card (with border) for final content
            resDiv.innerHTML = `<div class="result-card"><div class="ai-content">${tempDiv.innerHTML}</div></div>`;
        })
        .catch(() => {
            btnText.style.display = 'inline';
            spinner.classList.add('hidden');
            askBtn.disabled = false;
            resDiv.innerHTML = "<div class='result-card loading-state'><div class='ai-content'>Connection Error.</div></div>";
        });
}

function getSuggestions() {
    const query = document.getElementById('q').value;
    const suggestDiv = document.getElementById('suggestions');
    if (query.length < 2) { suggestDiv.innerHTML = ''; return; }
    fetch(`/suggest?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(list => {
            suggestDiv.innerHTML = list.map(item => `<div class="s-item" onclick="selectSuggest('${item}')">${item}</div>`).join('');
        });
}

function selectSuggest(val) {
    document.getElementById('q').value = val;
    document.getElementById('suggestions').innerHTML = '';
    search();
}