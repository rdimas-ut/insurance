// const {
//   default: installExtension,
//   REACT_DEVELOPER_TOOLS,
// } = require("electron-devtools-installer");
const { app, BrowserWindow } = require("electron");
const { ipcMain } = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const iconpath = require("path");
const emptypath = require("path");

const ExcelJS = require("exceljs");
const https = require("https");
const puppeteer = require("puppeteer");
const fs = require("fs");
const username = require("username");
const userdirectory = require("os").homedir();

let aRawData = fs.readFileSync(
  emptypath.join(__dirname, "azurefunctionlinks.json")
);
let aLinks = JSON.parse(aRawData);
const dbazurefunction = aLinks.dbazurefunction;
const authazurefunction = aLinks.authazurefunction;

function myDateDisp(dateInt, includeDay = false) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const date = new Date(dateInt);
  const year = date.getFullYear();
  const day =
    date.getDate() < 10 ? "0" + String(date.getDate()) : String(date.getDate());
  const month = monthNames[date.getMonth()].substring(0, 3);
  return includeDay ? day + "-" + month + "-" + year : month + "-" + year;
}

app.whenReady().then(() => {
  // if (isDev) {
  //   installExtension(REACT_DEVELOPER_TOOLS)
  //     .then((name) => console.log(`Added Extension:  ${name}`))
  //     .catch((err) => console.log("An error occurred: ", err));
  // }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("username", async (e) => {
  return username.sync();
});

ipcMain.handle("readExcel", async (e, path) => {
  const workbook = new ExcelJS.Workbook();
  console.log(path);

  try {
    await workbook.xlsx.readFile(path);
  } catch (error) {
    console.log(error);
  }

  const worksheet = workbook.getWorksheet(1);
  worksheet.getColumn(1).eachCell((cell, rowNumber) => {
    console.log(cell.value);
  });
  const sold = ["SOLD", "sold", "Sold"];

  var returnValues = {
    MGU: "",
    Carrier: "",
    Network: "",
    Admin: "",
    MIC: "",
    StartDate: "",

    EE: "",
    ES: "",
    EC: "",
    EF2: "",
    EF4: "",
    Comp: "",
    AggComp: "",
  };

  const valueNames = {
    MGU: ["MGU", "mgu"],
    Carrier: ["Stop Loss Carrier", "stop loss carrier"],
    Network: ["Network", "Medical Network"],
    Admin: ["Administrator", "TPA", "administrator"],
    MIC: ["Months in Contract", "months in contract"],

    EE: ["Specific Employee"],
    ES: ["Specific Emp+Spouse"],
    EC: ["Specific Emp+Child"],
    EF2: ["Specific Family-2 tier"],
    EF4: ["Specific Family-4 tier"],
    Comp: ["Specific Composite"],
    AggComp: ["Aggregate Premium", "aggregate Premium"],
  };

  // Locations of important blocks of data
  var soldLoc = 0;
  var stopLossTermsLoc = 0;
  var stopLossPremiumLoc = 0;

  // Locations of other values

  // Tries to find the sold column
  for (var i = 1; i <= worksheet.actualColumnCount; i++) {
    worksheet.getColumn(i).eachCell((cell, rowNumber) => {
      console.log(i + String(cell.value));
      if (cell.value != null) {
        if (sold.some((element) => String(cell.value).includes(element))) {
          soldLoc = i;
        }
      }
    });
  }

  // Find Stop Loss Terms
  worksheet.getColumn(1).eachCell((cell, rowNumber) => {
    if (String(cell.value).includes("Stop Loss Terms")) {
      stopLossTermsLoc = rowNumber;
    }
  });

  // Find Stop Loss Premium
  worksheet.getColumn(1).eachCell((cell, rowNumber) => {
    if (String(cell.value).includes("Stop Loss Premium")) {
      stopLossPremiumLoc = rowNumber;
    }
  });

  // Print out location
  console.log("Location of Sold" + String(soldLoc));
  console.log("Location of Terms" + String(stopLossTermsLoc));
  console.log("Location of Premiums" + String(stopLossPremiumLoc));

  // Find the rest of the values needed
  if (soldLoc) {
    console.log("Found Sold");
    // Write something to find the start date
    var firstCell = false;
    worksheet.getColumn(1).eachCell((cell, rowNumber) => {
      if (!firstCell) {
        firstCell = true;
        if (typeof cell.value === "string") {
          try {
            var res = cell.value.split("-");
            res = res[1];
            res = res.substring(res.indexOf(":") + 1, res.length - 1);
            res = new Date(res);
            returnValues.StartDate = res.getTime();
          } catch (err) {
            console.log(error);
          }
        }
      }
    });

    // Finds all the values
    worksheet.getColumn(1).eachCell((cell, rowNumber) => {
      if (
        rowNumber >= stopLossTermsLoc &&
        rowNumber < stopLossTermsLoc + 6 &&
        stopLossTermsLoc
      ) {
        if (
          valueNames.MGU.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.MGU = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.Carrier.some((element) =>
            String(cell.value).includes(element)
          )
        ) {
          returnValues.Carrier = worksheet
            .getRow(rowNumber)
            .getCell(soldLoc).value;
        }
        if (
          valueNames.Network.some((element) =>
            String(cell.value).includes(element)
          )
        ) {
          returnValues.Network = worksheet
            .getRow(rowNumber)
            .getCell(soldLoc).value;
        }
        if (
          valueNames.Admin.some((element) =>
            String(cell.value).includes(element)
          )
        ) {
          returnValues.Admin = worksheet
            .getRow(rowNumber)
            .getCell(soldLoc).value;
        }
        if (
          valueNames.MIC.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.MIC = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
      } else if (
        rowNumber >= stopLossPremiumLoc &&
        rowNumber < stopLossPremiumLoc + 13 &&
        stopLossPremiumLoc
      ) {
        if (
          valueNames.EE.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.EE = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.ES.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.ES = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.EC.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.EC = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.EF2.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.EF2 = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.EF4.some((element) => String(cell.value).includes(element))
        ) {
          returnValues.EF4 = worksheet.getRow(rowNumber).getCell(soldLoc).value;
        }
        if (
          valueNames.Comp.some((element) =>
            String(cell.value).includes(element)
          )
        ) {
          returnValues.Comp = worksheet
            .getRow(rowNumber)
            .getCell(soldLoc).value;
        }
        if (
          valueNames.AggComp.some((element) =>
            String(cell.value).includes(element)
          ) &&
          !returnValues.AggComp
        ) {
          returnValues.AggComp = worksheet
            .getRow(rowNumber)
            .getCell(soldLoc).value;
        }
      }
    });
  }

  // Restricts type to string or number
  for (const [key, value] of Object.entries(returnValues)) {
    if (typeof value != "string" && typeof value != "number") {
      returnValues[String(key)] = "";
    }
  }

  // Checks type of values return
  returnValues.MGU = String(returnValues.MGU);
  returnValues.Carrier = String(returnValues.Carrier);
  returnValues.Network = String(returnValues.Network);
  returnValues.Admin = String(returnValues.Admin);
  returnValues.StartDate = parseInt(returnValues.StartDate);
  if (!returnValues.StartDate) {
    returnValues.StartDate = "";
  }
  returnValues.MIC = parseInt(returnValues.MIC);
  if (!returnValues.MIC) {
    returnValues.MIC = "";
  }

  returnValues.EE = parseFloat(returnValues.EE);
  if (!returnValues.EE) {
    returnValues.EE = "";
  }
  returnValues.ES = parseFloat(returnValues.ES);
  if (!returnValues.ES) {
    returnValues.ES = "";
  }
  returnValues.EC = parseFloat(returnValues.EC);
  if (!returnValues.EC) {
    returnValues.EC = "";
  }
  returnValues.EF2 = parseFloat(returnValues.EF2);
  if (!returnValues.EF2) {
    returnValues.EF2 = "";
  }
  returnValues.EF4 = parseFloat(returnValues.EF4);
  if (!returnValues.EF4) {
    returnValues.EF4 = "";
  }
  returnValues.Comp = parseFloat(returnValues.Comp);
  if (!returnValues.Comp) {
    returnValues.Comp = "";
  }
  returnValues.AggComp = parseFloat(returnValues.AggComp);
  if (!returnValues.AggComp) {
    returnValues.AggComp = "";
  }

  console.log(returnValues);

  return returnValues;
});

ipcMain.handle("execute", async (e, commd) => {
  var parsedData;
  try {
    parsedData = await execute(commd);
  } catch (err) {
    console.log(err);
  }
  return parsedData;
});

ipcMain.handle("insert", async (e, tableName, dataDict) => {
  console.log("insert");
  var parsedData;
  try {
    parsedData = await insert(tableName, dataDict);
  } catch (err) {
    console.log(err);
  }

  console.log(parsedData);
  return parsedData;
});

ipcMain.handle("createInvoice", async (e, invData, invLines) => {
  var res;
  try {
    res = await createInvoice(invData, invLines);
  } catch (err) {
    console.log(err);
  }
  return res[1];
});

ipcMain.handle("createBill", async (e, billData, billLines, billCensus) => {
  console.log(billData);
  console.log(billLines);
  console.log(billCensus);

  var res;
  try {
    res = await createBill(billData, billLines);
  } catch (err) {
    console.log(err);
  }

  return res[1];
});

ipcMain.handle("delete", async (e, tableName, searchDict) => {
  console.log("delete");
  var parsedData;
  try {
    parsedData = await delete_db(tableName, searchDict);
  } catch (err) {
    console.log(err);
  }

  console.log(parsedData);
  return parsedData;
});

ipcMain.handle("update", async (e, tableName, dataDict, searchDict) => {
  console.log("update");
  var parsedData;
  try {
    parsedData = await update(tableName, dataDict, searchDict);
  } catch (err) {
    console.log(err);
  }

  console.log(parsedData);
  return parsedData;
});

ipcMain.handle("qbo", async (e, apiCallName) => {
  const request = new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: apiCallName,
        parameters: "{}",
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      const { statusCode } = res;
      console.log(statusCode);
      resolve(statusCode);
    });

    req.end();
    req.on("error", (err) => {
      reject(err);
    });
  });
});

ipcMain.handle("getState", async () => {
  var parsedData;
  try {
    parsedData = await getStateRequest();
  } catch (err) {
    console.error(err);
  }
  return parsedData;
});

ipcMain.handle("qboSignOut", async () => {
  console.log("qboSignOut");
  try {
    await revokeTokens();
  } catch (err) {
    console.log(err);
  }
});

ipcMain.handle("qboSignIn", () => {
  https.get(authazurefunction, (res) => {
    const { statusCode } = res;

    res.setEncoding("utf8");
    let rawData = "";
    res.on("data", (chunk) => {
      console.log(`BODY: ${chunk}`);
      rawData += chunk;
    });

    res.on("end", () => {
      const winAuth = new BrowserWindow({
        width: 680,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
        },
        icon: iconpath.join(__dirname, "icon.png"),
      });
      winAuth.loadURL(rawData);
    });
  });
});

ipcMain.handle("billPDF", async () => {
  await generatePDFTest();
});

ipcMain.handle("sharepoint", async () => {
  var res;
  try {
    res = await sharepoint();
  } catch (err) {
    console.log(err);
  }
  return res;
});

ipcMain.handle("generatePDF", async (e, billData, billLines, billCensus) => {
  await generatePDF(billData, billLines, billCensus);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    icon: iconpath.join(__dirname, "icon.png"),
  });

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadURL(`file://${path.join(__dirname, "../build/index.html")}`);
  }
}

function getStateRequest() {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "getState",
        parameters: "{}",
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      let rawData = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        try {
          parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function revokeTokens() {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "revokeTokens",
        parameters: "{}",
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      const { statusCode } = res;

      console.log(statusCode);
      resolve(statusCode);
    });

    req.end();
    req.on("error", (err) => {
      reject(err);
    });
  });
}

function execute(commd) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "execute",
        parameters: JSON.stringify({ commd }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          console.log(rawData);
          parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function createInvoice(invData, invLines) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "createInvoice",
        parameters: JSON.stringify({
          invData: invData,
          invLines: invLines,
        }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          resolve([rawData, res.statusCode]);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function createBill(billData, billLines, billCensus) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "createBill",
        parameters: JSON.stringify({
          billData: billData,
          billLines: billLines,
        }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          resolve([rawData, res.statusCode]);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function insert(tableName, dataDict) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "insert",
        parameters: JSON.stringify({
          tableName: tableName,
          dataDict: dataDict,
        }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          console.log(rawData);
          resolve(rawData);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function delete_db(tableName, searchDict) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "delete",
        parameters: JSON.stringify({
          tableName: tableName,
          searchDict: searchDict,
        }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          console.log(rawData);
          resolve(parsedData);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function update(tableName, dataDict, searchDict) {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "delete",
        parameters: JSON.stringify({
          tableName: tableName,
          dataDict: dataDict,
          searchDict: searchDict,
        }),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          console.log(rawData);
          parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function sharepoint() {
  return new Promise((resolve, reject) => {
    reqOptions = {
      method: "GET",
      headers: {
        call: "sharepoint",
        parameters: JSON.stringify({}),
      },
    };

    let req = https.request(dbazurefunction, reqOptions, (res) => {
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        try {
          resolve(res.statusCode);
        } catch (err) {
          console.error(err.message);
        }
      });
    });

    req.end();

    req.on("error", (err) => {
      reject(err);
    });
  });
}

async function generatePDFTest() {
  // Sets the index.html
  // Launch a new browser session.
  const browser = await puppeteer.launch();
  // Open a new Page.
  const page = await browser.newPage();
  await page.goto(`file:${emptypath.join(__dirname, "invoice_template.html")}`);

  console.log(userdirectory + "\\Desktop\\invoice.pdf");

  // Store the PDF in a file named `invoice.pdf`.
  await page.pdf({
    path: userdirectory + "\\Desktop\\invoice.pdf",
    format: "A4",
  });
  await browser.close();
}

async function generatePDF(billData, billLines, billCensus) {
  // Sets the index.html
  // Launch a new browser session.
  const browser = await puppeteer.launch();
  // Open a new Page.
  const page = await browser.newPage();
  await page.goto(`file:${emptypath.join(__dirname, "invoice_template.html")}`);
  await page.waitForSelector("#invoicetbody");
  await page.evaluate((billLines) => {
    let dom = document.querySelector("#invoicetbody");
    var invNodes = dom.firstElementChild;

    invNodes = invNodes.nextElementSibling;
    invNodes = invNodes.nextElementSibling;

    var k;
    var totalLine = 0;
    for (k = 0; k < billLines.length; k++) {
      var tableLine = document.createElement("TR");
      tableLine.className = k < billLines.length - 1 ? "item" : "item last";
      tableLine.insertCell(0).innerHTML = billLines[k].Description;
      tableLine.insertCell(1).innerHTML = billLines[k].Customer;
      tableLine.insertCell(2).innerHTML = billLines[k].Category;
      tableLine.insertCell(3).innerHTML = billLines[k].Amount;
      dom.appendChild(tableLine);
      totalLine += parseFloat(billLines[k].Amount);
    }

    var tableLine = document.createElement("TR");
    tableLine.className = "total";
    tableLine.insertCell(0).innerHTML = "";
    tableLine.insertCell(1).innerHTML = "";
    tableLine.insertCell(2).innerHTML = "";
    var totalLineString = "Total: $";
    totalLineString = totalLineString.concat(totalLine.toFixed(2));
    tableLine.insertCell(3).innerHTML = totalLineString;
    dom.appendChild(tableLine);
  }, billLines);

  var pdfName = billData.Vendor;
  pdfName += " " + myDateDisp(billData.BillDate);
  pdfName += " Invoice.pdf";
  console.log(userdirectory + "\\Desktop\\" + pdfName);

  // Store the PDF in a file named `invoice.pdf`.
  await page.pdf({
    path: userdirectory + "\\Desktop\\" + pdfName,
    format: "A4",
  });
  await browser.close();

  // Census

  // Launch a new browser session.
  const censusBrowser = await puppeteer.launch();
  // Open a new Page.
  const censusPage = await censusBrowser.newPage();
  await censusPage.goto(
    `file:${emptypath.join(__dirname, "census_template.html")}`
  );
  await censusPage.waitForSelector("#invoicetbody");
  await censusPage.evaluate((billCensus) => {
    function myDateDisp(dateInt, includeDay = false) {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const date = new Date(dateInt);
      const year = date.getFullYear();
      const day =
        date.getDate() < 10
          ? "0" + String(date.getDate())
          : String(date.getDate());
      const month = monthNames[date.getMonth()].substring(0, 3);
      return includeDay ? day + "-" + month + "-" + year : month + "-" + year;
    }

    let dom = document.querySelector("#invoicetbody");
    var invNodes = dom.firstElementChild;

    invNodes = invNodes.nextElementSibling;
    invNodes = invNodes.nextElementSibling;

    var k;
    for (k = 0; k < billCensus.length; k++) {
      if (billCensus[k].EE != 0) {
        var tableLine = document.createElement("TR");
        tableLine.className = k < billCensus.length - 1 ? "item" : "item last";
        tableLine.insertCell(0).innerHTML = billCensus[k].Customer;
        tableLine.insertCell(1).innerHTML = "EE";
        tableLine.insertCell(2).innerHTML = myDateDisp(billCensus[k].CovDate);
        tableLine.insertCell(3).innerHTML = billCensus[k].EE;
        dom.appendChild(tableLine);
      }

      if (billCensus[k].ES != 0) {
        var tableLine = document.createElement("TR");
        tableLine.className = k < billCensus.length - 1 ? "item" : "item last";
        tableLine.insertCell(0).innerHTML = billCensus[k].Customer;
        tableLine.insertCell(1).innerHTML = "ES";
        tableLine.insertCell(2).innerHTML = myDateDisp(billCensus[k].CovDate);
        tableLine.insertCell(3).innerHTML = billCensus[k].ES;
        dom.appendChild(tableLine);
      }

      if (billCensus[k].EC != 0) {
        var tableLine = document.createElement("TR");
        tableLine.className = k < billCensus.length - 1 ? "item" : "item last";
        tableLine.insertCell(0).innerHTML = billCensus[k].Customer;
        tableLine.insertCell(1).innerHTML = "EC";
        tableLine.insertCell(2).innerHTML = myDateDisp(billCensus[k].CovDate);
        tableLine.insertCell(3).innerHTML = billCensus[k].EC;
        dom.appendChild(tableLine);
      }

      if (billCensus[k].EF != 0) {
        var tableLine = document.createElement("TR");
        tableLine.className = k < billCensus.length - 1 ? "item" : "item last";
        tableLine.insertCell(0).innerHTML = billCensus[k].Customer;
        tableLine.insertCell(1).innerHTML = "EF";
        tableLine.insertCell(2).innerHTML = myDateDisp(billCensus[k].CovDate);
        tableLine.insertCell(3).innerHTML = billCensus[k].EF;
        dom.appendChild(tableLine);
      }
    }
  }, billCensus);

  var pdfName = billData.Vendor;
  pdfName += " " + myDateDisp(billData.BillDate);
  pdfName += " Census.pdf";
  console.log(userdirectory + "\\Desktop\\" + pdfName);

  // Store the PDF in a file named `invoice.pdf`.
  await censusPage.pdf({
    path: userdirectory + "\\Desktop\\" + pdfName,
    format: "A4",
  });
  await censusBrowser.close();
}
