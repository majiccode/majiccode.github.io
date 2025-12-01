const initNotebook = () => {
  const addCellButton = document.getElementById("add-cell");
  const runAllButton = document.getElementById("run-all");
  const cellsContainer = document.getElementById("notebook-cells");

  if (!addCellButton) {
    // Elements not ready, wait a bit
    setTimeout(initNotebook, 50);
    return;
  }

  let cellCounter = 0;

  const createCell = () => {
    cellCounter++;
    const cellId = `cell-${cellCounter}`;

    const cellWrapper = document.createElement("div");
    cellWrapper.classList.add("cell-wrapper");
    cellWrapper.id = cellId;

    const cell = document.createElement("div");
    cell.classList.add("cell");

    const cellToolbar = document.createElement("div");
    cellToolbar.classList.add("cell-toolbar");

    const runButton = document.createElement("button");
    runButton.textContent = "Run";
    runButton.addEventListener("click", () => runCell(cellId));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      const cellToDelete = document.getElementById(cellId);
      if (cellToDelete) {
        cellsContainer.removeChild(cellToDelete);
      }
    });

    cellToolbar.appendChild(runButton);
    cellToolbar.appendChild(deleteButton);

    const inputArea = document.createElement("textarea");
    inputArea.classList.add("cell-input");
    inputArea.rows = 5;

    const outputArea = document.createElement("div");
    outputArea.classList.add("cell-output");

    cell.appendChild(inputArea);
    cell.appendChild(outputArea);

    cellWrapper.appendChild(cellToolbar);
    cellWrapper.appendChild(cell);

    cellsContainer.appendChild(cellWrapper);
  };

  const runCell = (cellId) => {
    const cell = document.getElementById(cellId);
    if (!cell) return;

    const inputArea = cell.querySelector(".cell-input");
    const outputArea = cell.querySelector(".cell-output");
    const code = inputArea.value;

    outputArea.innerHTML = ""; // Clear previous output

    try {
      // Redirect console.log to the output area
      const originalLog = console.log;
      console.log = (...args) => {
        const output = args
          .map((arg) => {
            if (typeof arg === "object" && arg !== null) {
              return JSON.stringify(arg, null, 2);
            }
            return String(arg);
          })
          .join(" ");
        outputArea.textContent += output + "\n";
      };

      const result = new Function(code)();

      if (result !== undefined) {
        outputArea.textContent += String(result);
      }

      // Restore original console.log
      console.log = originalLog;
    } catch (error) {
      outputArea.textContent = `Error: ${error.message}`;
    }
  };

  const runAllCells = () => {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell) => runCell(cell.id));
  };

  addCellButton.addEventListener("click", createCell);
  runAllButton.addEventListener("click", runAllCells);

  // Create a default cell on load
  if (cellsContainer.children.length === 0) {
    createCell();
  }
};

initNotebook();
