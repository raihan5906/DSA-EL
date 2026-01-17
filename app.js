function search() {
    const q = document.getElementById("q").value;
    const resDiv = document.getElementById("result");
    document.getElementById("suggestions").style.display = "none";
    if(!q) return;
    resDiv.innerHTML = "<i>Searching...</i>";

    fetch(`/search?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
            let text = data.answer.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            resDiv.innerHTML = `<h2>${data.query}</h2><div>${text}</div>`;
        })
        .catch(err => {
            resDiv.innerHTML = "Error: Check your server terminal.";
        });
}

function getSuggestions() {
    const q = document.getElementById("q").value;
    const sugDiv = document.getElementById("suggestions");
    if (q.length < 1) { sugDiv.style.display = "none"; return; }

    fetch(`/suggest?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(list => {
            if (list.length > 0) {
                sugDiv.style.display = "block";
                sugDiv.innerHTML = list.map(item => `<div class="sug-item" onclick="selectSug('${item}')">🔍 ${item}</div>`).join("");
            } else { sugDiv.style.display = "none"; }
        });
}

function selectSug(val) {
    document.getElementById("q").value = val;
    search();
}