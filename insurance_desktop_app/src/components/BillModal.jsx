import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Col } from "react-bootstrap";
import { myDate, myTime, billMonthValid } from "./DateHelpers";
import { useInterval } from "./CustomerHooks";

export const BillModal = (props) => {
  const [billmonth, setBillMonth] = useState("");

  // New
  const [validated, setValidated] = useState(false);

  // Line array
  const [customerList, setCustomerList] = useState([]);
  const [billFeesObject, setBillFeesObject] = useState({});
  const [actualObject, setActualObject] = useState({});
  const [adjustmentsObject, setAdjustments] = useState({});

  // For Premium Selection
  const [customerListText, setCustomerListText] = useState([]);

  const [lines, setLines] = useState([]);

  // Total Array
  const [total, setTotal] = useState(0);

  // Premium Amounts change it to []
  const [premium, setPremium] = useState([
    {
      Customer: "",
      Invoice_Month: "",
      BFID: 0,
      Premium: 0,
      Rate: 0,
      CalculationMethod: "",
    },
  ]);

  const formatData = () => {
    // Finds the bill fees
    var billfees = props.billfees.filter(
      (bf) => bf.Vendor === props.tabState[2]
    );

    var bfpid = new Set();
    billfees.forEach((bf) => {
      bfpid.add(bf.PID);
    });

    var policies = props.policies.filter((pl) => bfpid.has(pl.PID));
    policies = policies.filter((pl) =>
      billMonthValid(pl.StartDate, pl.MIC, billmonth)
    );

    var plpid = new Set();
    policies.forEach((pl) => {
      plpid.add(pl.PID);
    });

    billfees = billfees.filter((bf) => plpid.has(bf.PID));

    // Goups the bill fees by Customer
    var clist = new Set();
    policies.forEach((pl) => {
      clist.add([pl.Customer, pl.PID]);
    });

    // Objects that keep the Actual, Adj, and Bill Fees
    var bfObject = {};
    var acObject = {};
    var adjObject = {};
    var allacObject = {};

    clist.forEach((cl) => {
      bfObject[cl[1]] = [];
      acObject[cl[1]] = {
        Customer: cl[0],
        EE: 0,
        EC: 0,
        ES: 0,
        EF: 0,
      };
      allacObject[cl[1]] = [];
      adjObject[cl[1]] = [];
    });

    billfees.forEach((bf) => {
      bfObject[bf.PID].push(bf);
    });

    // Finds adjustments needed
    props.censusbilled.forEach((cb) => {
      props.census.forEach((c) => {
        if (
          cb.Customer === c.Customer &&
          c.Status === "Actual" &&
          cb.CovDate === c.CovDate
        ) {
          var differences = [0, 0, 0, 0];
          differences[0] = c.EE - cb.EE;
          differences[0] = c.EC - cb.EC;
          differences[0] = c.ES - cb.ES;
          differences[0] = c.EF - cb.EF;

          if (
            Math.abs(differences[0]) > 0 ||
            Math.abs(differences[1]) > 0 ||
            Math.abs(differences[2]) > 0 ||
            Math.abs(differences[3]) > 0
          ) {
            var adjustment = {
              Customer: c.Customer,
              EE: differences[0],
              EC: differences[1],
              ES: differences[2],
              EF: differences[3],
              CovDate: cb.CovDate,
            };
            clist.forEach((cl) => {
              if (cb.Customer === cl[0]) {
                adjObject[cl[1]].push(adjustment);
              }
            });
          }
        }
      });
    });

    // Finds the census actual to be used for billed
    var billedcensus = props.census.filter((c) => c.Status === "Actual");

    billedcensus.forEach((bc) => {
      clist.forEach((cl) => {
        if (bc.Customer === cl[0]) {
          allacObject[cl[1]].push(bc);
        }
      });
    });

    clist.forEach((cl) => {
      allacObject[cl[1]].sort((a, b) => (a.CovDate < b.CovDate ? 1 : -1));
      if (allacObject[cl[1]].length) {
        acObject[cl[1]] = allacObject[cl[1]][0];
      }
    });

    // Need to find the billed census if it exists

    // adjObject should have all adjustments, acObject should have newest actuals and
    // bfObject should have all bill fees of customer
    setCustomerList(clist);
    setBillFeesObject(bfObject);
    setActualObject(acObject);
    setAdjustments(adjObject);
  };

  const createLines = () => {
    // console.log(customerList);
    // console.log(billFeesObject);
    // console.log(actualObject);
    // console.log(adjustmentsObject);
    console.log(lines);

    var newLines = [];

    // var BillLineObjectTemplate = {
    //   Description: "",
    //   Category: "",
    //   Rate: 23,
    //   Lives: 23,
    //   Amount: 2,
    //   Customer: "",
    // };

    customerList.forEach((cl) => {
      var billsForCustomer = billFeesObject[cl[1]];

      billsForCustomer.forEach((bfc) => {
        var lives = 0;

        if (bfc.Calc.includes("EE")) {
          lives += actualObject[cl[1]].EE;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EE;
          });
        } else if (bfc.Calc.includes("ES")) {
          lives += actualObject[cl[1]].ES;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.ES;
          });
        } else if (bfc.Calc.includes("EC")) {
          lives += actualObject[cl[1]].EC;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EC;
          });
        } else if (bfc.Calc.includes("EF")) {
          lives += actualObject[cl[1]].EF;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EF;
          });
        } else if (bfc.Calc.includes("Composite")) {
          lives += actualObject[cl[1]].EE;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EE;
          });
          lives += actualObject[cl[1]].ES;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.ES;
          });
          lives += actualObject[cl[1]].EC;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EC;
          });
          lives += actualObject[cl[1]].EF;
          adjustmentsObject[cl[1]].forEach((adj) => {
            lives += adj.EF;
          });
        } else if (bfc.Calc === "Flat Fee") {
          lives = 1;
        }

        if (
          bfc.Calc !== "Percent of Premium (Group)" &&
          bfc.Calc !== "Percent of Premium (Carrier)"
        ) {
          newLines.push({
            Description: bfc.Calc,
            Category: bfc.Product,
            Rate: bfc.Rate,
            BFID: bfc.BFID,
            Lives: lives,
            Amount: bfc.Rate * lives,
            Customer: cl[0],
            Selected: true,
          });
        }
      });
    });

    premium.forEach((prem, i) => {
      var lineTemp = {
        Description: "",
        Category: "",
        Rate: 1,
        BFID: 0,
        Lives: 1,
        Amount: 0,
        Customer: "",
        Selected: true,
      };
      // console.log(Array.from(customerList));
      Array.from(customerList).forEach((cust, i) => {
        if (prem.Customer === cust[0]) {
          var bfc = billFeesObject[cust[1]][0];
          newLines.push({
            Description: bfc.Calc,
            Category: bfc.Product,
            Rate: bfc.Rate,
            BFID: bfc.BFID,
            Lives: 1,
            Amount: bfc.Rate * prem.Premium,
            Customer: cust[0],
            Selected: true,
          });
        }
      });
    });

    setLines(newLines);
  };

  const handleCustomerList = () => {
    var newCustomerlistText = new Set();

    Object.keys(billFeesObject).forEach((key) => {
      billFeesObject[key].forEach((bLine) => {
        console.log(bLine.Vendor);
        if (bLine.Calc === "Percent of Premium (Group)") {
          newCustomerlistText.add(bLine.Vendor);
        }

        if (bLine.Calc === "Percent of Premium (Carrier)") {
          newCustomerlistText.add(bLine.Vendor);
        }
      });
    });

    setCustomerListText(Array.from(newCustomerlistText));
  };

  const handleSubmit = (event) => {
    var billData = {};
    var billLines = [];
    var billCensus = [];

    event.preventDefault();
    event.stopPropagation();

    const form = event.currentTarget;
    const isValid = form.checkValidity();
    if (isValid) {
      billData = {
        Vendor: props.vendor,
        BillDate: myTime(billmonth),
      };

      console.log("Actual Object");
      console.log(actualObject);

      for (const [key, value] of Object.entries(actualObject)) {
        console.log(`${key}: ${value}`);
        billCensus.push({
          Customer: actualObject[key].Customer,
          EE: actualObject[key].EE,
          ES: actualObject[key].ES,
          EC: actualObject[key].EC,
          EF: actualObject[key].EF,
          DTS: Math.floor(Date.now() / 1000),
          InvDate: myTime(billmonth),
          CovDate: myTime(billmonth),
          Status: "Billed",
          User: "No User",
        });
      }

      console.log("Adjustments Object");
      console.log(adjustmentsObject);
      for (const [key, value] of Object.entries(adjustmentsObject)) {
        console.log(`${key}: ${value}`);
        adjustmentsObject[key].forEach((adjO) => {
          billCensus.push({
            Customer: adjO.Customer,
            EE: adjO.EE,
            ES: adjO.ES,
            EC: adjO.EE,
            EF: adjO.EF,
            DTS: Math.floor(Date.now() / 1000),
            InvDate: myTime(billmonth),
            CovDate: myTime(adjO.CovDate),
            Status: "Billed",
            User: "No User",
          });
        });
      }

      lines.forEach((li) => {
        billLines.push({
          Description: li.Description,
          Category: li.Category,
          Amount: li.Amount,
          Customer: li.Customer,
        });
      });

      props.onBillCreate(billData, billLines, billCensus);

      handleHide();
    }

    setValidated(true);
  };

  const createTotal = () => {
    var newTotal = 0;
    if (lines.length) {
      lines.forEach((line) => {
        newTotal += Number(line.Amount);
      });
    }

    setTotal(newTotal.toFixed(2));
  };

  const handleReset = () => {
    setBillMonth("");
    setValidated(false);

    setCustomerList([]);
    setBillFeesObject({});
    setActualObject({});
    setAdjustments({});

    setLines([]);

    setTotal(0);
  };

  const handleHide = () => {
    handleReset();
    props.onHide();
  };

  useInterval(formatData, 1000);
  useInterval(createTotal, 1000);
  useInterval(createLines, 1000);
  useInterval(handleCustomerList, 100);

  return (
    <Modal
      show={props.show}
      onHide={handleHide}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">Bill</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form noValidate onSubmit={handleSubmit} validated={validated}>
          <Form.Group controlId="invicemonth">
            <Form.Label>Bill Month</Form.Label>
            <Form.Control
              value={billmonth}
              onChange={(event) => {
                setBillMonth(event.target.value);
              }}
              type="month"
              required
            />
          </Form.Group>

          {premium.map((prem, i) => {
            return (
              <div key={"Premium Based Fees - " + String(i)}>
                <Form.Row className="premfeesdetails">
                  <Form.Group
                    as={Col}
                    md="3"
                    controlId={"Customer - " + String(i)}
                  >
                    <Form.Label>Customer</Form.Label>
                    <Form.Control
                      disabled={false}
                      value={prem.Customer}
                      onChange={(e) => {
                        premium[i].Customer = e.target.value;
                        setPremium(premium);
                      }}
                      type="text"
                      placeholder="Customer"
                      required={true}
                      as="select"
                      customer
                    >
                      <option value="">Choose...</option>
                      {customerListText.map((cust) => {
                        return <option value={cust}>{cust}</option>;
                      })}
                    </Form.Control>
                  </Form.Group>
                  <Form.Group
                    as={Col}
                    md="3"
                    controlId={"Invoice Month - " + String(i)}
                  >
                    <Form.Label>Invoice Month</Form.Label>
                    <Form.Control
                      disabled={false}
                      onChange={(e) => {
                        console.log(e.target.value);
                      }}
                      type="month"
                      required={false}
                      className="mr-sm-2"
                    ></Form.Control>
                  </Form.Group>

                  <Form.Group
                    as={Col}
                    md="2"
                    controlId={"Premium - " + String(i)}
                  >
                    <Form.Label>Premium</Form.Label>
                    <Form.Control
                      disabled={false}
                      value={prem.Premium}
                      onChange={(e) => {
                        premium[i].Premium = e.target.value;
                        setPremium(premium);
                      }}
                      type="number"
                      step=".01"
                      placeholder="Premium"
                      required={false}
                    />
                  </Form.Group>
                  {i === premium.length - 1 && (
                    <div className="MyInlineButton">
                      <Button
                        disabled={false}
                        onClick={() => {
                          premium.push({
                            Customer: "",
                            Invoice_Month: "",
                            BFID: 0,
                            Premium: 0,
                            Rate: 0,
                            CalculationMethod: "",
                          });
                          setPremium(premium);
                        }}
                        size="sm"
                        variant="primary"
                      >
                        +
                      </Button>
                    </div>
                  )}
                  {i < premium.length - 1 && (
                    <div className="MyInlineButton">
                      <Button
                        disabled={false}
                        onClick={() => {
                          premium.splice(i, 1);
                          setPremium(premium);
                        }}
                        size="sm"
                        variant="danger"
                      >
                        x
                      </Button>
                    </div>
                  )}
                </Form.Row>
              </div>
            );
          })}

          {billmonth && (
            <div>
              <h4>Lines</h4>

              <div className="MyTable InvoiceModalLines">
                <div>
                  <table>
                    <thead>
                      <th className="TextLines">Description</th>
                      <th className="TextLines">Product/Service</th>
                      <th className="TextLines">Customer</th>
                      <th className="FloatLines">Rate</th>
                      <th className="FloatLines">Lives</th>
                      <th className="FloatLines">Amount</th>
                      <th className="SelectButton"></th>
                    </thead>
                  </table>
                </div>
                {lines.map((li) => {
                  return (
                    <div key={li.Description + li.Category}>
                      <table>
                        <tbody>
                          <tr>
                            <td className="TextLines">{li.Description}</td>
                            <td className="TextLines">{li.Category}</td>
                            <td className="TextLines">{li.Customer}</td>
                            <td className="FloatLines">{li.Rate}</td>
                            <td className="FloatLines">{li.Lives}</td>
                            <td className="FloatLines">{li.Amount}</td>
                            <td className="SelectButton"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                <div key="blanktotal">
                  <table>
                    <tbody>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div key="total">
                  <table>
                    <tbody>
                      <tr>
                        <td>Total</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>{total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <h1></h1>
              <Form.Row>
                <div className="MyFormButton">
                  <Button onClick={handleSubmit} type="button">
                    Submit
                  </Button>
                </div>
              </Form.Row>
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer></Modal.Footer>
    </Modal>
  );
};
