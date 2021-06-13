import "./styles.css";
import React, { Component } from "react";
import Insurance from "./insurance.svg";

class Sidebar extends Component {
  render() {
    const { tab, onTab } = this.props;

    var homeButtonClass = tab === "home" ? "selected" : "button";
    var customerButtonClass = tab === "customer" ? "selected" : "button";
    var vendorButtonClass = tab === "vendor" ? "selected" : "button";

    return (
      <div className="sidebar">
        <img src={Insurance} alt="Some text" />

        <button className={homeButtonClass} onClick={() => onTab("home")}>
          Home
        </button>
        <button
          className={customerButtonClass}
          onClick={() => onTab("customer")}
        >
          Customers
        </button>
        <button className={vendorButtonClass} onClick={() => onTab("vendor")}>
          Vendors
        </button>
      </div>
    );
  }
}

export default Sidebar;
