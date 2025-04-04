
var coll = document.getElementsByClassName("collapsible");
for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
}

window.onload = function () {
    loadTable();
    showBottom();
};

function addText() {
    var textInput = document.getElementById('textInput').value;

    if (textInput === "") {
        alert("Muistat jo kaiken?");
        return;
    }

    var storedTexts = JSON.parse(localStorage.getItem('texts')) || [];
    storedTexts.push(textInput);
    localStorage.setItem('texts', JSON.stringify(storedTexts));

    addRowToTable(textInput, storedTexts.length - 1);
    document.getElementById('textInput').value = "";
}

function addRowToTable(text, index) {
    var table = document.getElementById('textTable').getElementsByTagName('tbody')[0];
    var newRow = table.insertRow(0);
    var cell0 = newRow.insertCell(0);
    var cell1 = newRow.insertCell(1);
    var cell2 = newRow.insertCell(2);

    cell0.textContent = index+1;
    cell0.setAttribute('contentEditable', 'false');

    cell1.textContent = text;
    cell1.setAttribute('contentEditable', 'false');

    var editButton = document.createElement("button");

    editButton.textContent = '\u{0270E}';
    editButton.className = "edit";
    editButton.onclick = function () {
        toggleEdit(cell1, editButton, checkbox, index);
    };

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "delete-checkbox";

    cell2.appendChild(editButton);
    cell2.appendChild(checkbox);
}

function deleteRow(index) {
    var storedTexts = JSON.parse(localStorage.getItem('texts')) || [];

    if (index > -1) {
        storedTexts.splice(index, 1);
        localStorage.setItem('texts', JSON.stringify(storedTexts));
        loadTable();
    }
}

function loadTable() {
    var table = document.getElementById('textTable').getElementsByTagName('tbody')[0];
    table.innerHTML = "";

    var storedTexts = JSON.parse(localStorage.getItem('texts')) || [];
    storedTexts.forEach(function (text, index) {
        addRowToTable(text, index);
    });

}

function toggleEdit(cell, button, checkbox, index) {
    if (cell.isContentEditable) {
        cell.setAttribute('contentEditable', 'false');
        if (checkbox.checked) {
            deleteRow(index);
        } else {
            var storedTexts = JSON.parse(localStorage.getItem('texts')) || [];
            storedTexts[index] = cell.textContent;
            localStorage.setItem('texts', JSON.stringify(storedTexts));
        }
        button.textContent = '\u{0270E}';
        button.className = "edit";
        checkbox.style.display = "none";
    } else {
        cell.setAttribute('contentEditable', 'true');
        cell.focus();
        button.textContent = checkbox.checked ? '\u{02718}' : '\u{02713}';
        button.className = checkbox.checked ? "clear" : "save";
        checkbox.style.display = "inline-block";
    }

    checkbox.onchange = function () {
        button.textContent = checkbox.checked ? '\u{02718}' : '\u{02713}';
        button.className = checkbox.checked ? "clear" : "save";
    };
}

function showBottom() {
    const textContainer = document.getElementById("text-container");
    textContainer.textContent = localStorage.getItem("texts");
}

// Jos haluat, että copy/paste-laatiokssa on koko ajan ajantasainen listaus niin aktivoi eventListener. 
// Muuten anna olla kommenteissa ja vasta ikkunan refresh tuoreistaa tekstit. 
// Kätevä esim jos vahingossa poistaa jonkun rivin ja halusi muistaa mitä siinä lukikaan... 
//document.addEventListener('click', showBottom);