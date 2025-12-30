# Solar System Wiring Guide

This guide explains how to correctly wire a complete Solar System in the Electrical Simulator, from the Solar Panels to the AC loads in your home.

## 1. Required Components

You will need the following components from the **"Solar & DC"** toolbox category:

*   **Solar Panel (PV)**: Generates DC electricity from sunlight.
*   **Solar Charge Controller (MPPT)**: Regulates the voltage and current from the panels to safely charge the battery.
*   **Battery (Lead Acid)**: Stores the DC energy.
*   **Inverter (UPS)**: Converts the DC energy from the battery into AC electricity for your home appliances.
*   **DC MCB** (Optional but recommended): Provides isolation and protection for DC circuits.

## 2. Wiring Diagram (Step-by-Step)

### Step 1: Solar Panel to Charge Controller
1.  Place a **Solar Panel** and a **Solar Charge Controller** on the canvas.
2.  Connect the **Panel Positive (+)** terminal to the **Controller PV+** terminal.
3.  Connect the **Panel Negative (-)** terminal to the **Controller PV-**.
    *   *Tip: Use a **DC MCB** in between these connections to allow you to isolate the panels.*

### Step 2: Charge Controller to Battery
1.  Place a **Battery** on the canvas.
2.  Connect the **Controller BAT+** terminal to the **Battery Positive (+)** terminal.
3.  Connect the **Controller BAT-** terminal to the **Battery Negative (-)** terminal.
    *   *Note: Once connected, the Controller should detect the battery and, if the sun is shining (Panel enabled), start charging.*

### Step 3: Battery to Inverter
1.  Place an **Inverter** (or use your existing one).
2.  Locate the DC terminals on the Inverter (labeled **DC+** and **DC-**).
3.  Connect the **Battery Positive (+)** to the **Inverter DC+**.
4.  Connect the **Battery Negative (-)** to the **Inverter DC-**.
    *   *The Inverter will now prioritize using this external battery source.*

### Step 4: Inverter to Home Load (AC)
1.  Connect your AC Loads (Lamps, Fans) to the **Inverter AC Output (L and N)**.
2.  (Optional) Connect your **Mains Supply** to the **Inverter AC Input**.
    *   *In this "Hybrid" configuration, the Inverter will use Mains power when available (Bypass Mode) and switch to Battery power when Mains fails (Backup Mode).*

## 3. Configuration & Simulation

### Configuring Components
Click on any component to open the **Properties Panel**:
*   **Solar Panel**: Adjust `Rated Power (W)` to increase generation.
*   **Battery**: Adjust `Capacity (Ah)` to store more energy.
*   **Inverter**: Monitor `State of Charge` and `Load`.

### Simulation Behavior
*   **Charging**: When the Panel is active and wired to the Controller + Battery, you will see the Battery's "State of Charge" (SOC) increase over time.
*   **Discharging**: When the Inverter is powering loads in Battery Mode, the Battery SOC will decrease.
*   **Efficiency**: The system accounts for real-world efficiency losses (e.g., MPPT efficiency ~95%, Inverter efficiency ~90%).

## 4. Troubleshooting

*   **0 Amps on Inverter Load?**
    *   If the Inverter is in **Bypass Mode** (Mains ON), the load is technically powered by the Grid, not the Battery. The simulator attributes current to the active source.
    *   Disconnect the Mains wire (or disable the Supply) to force the Inverter into **Battery Mode**. You should then see the battery draining.

*   **Battery Not Charging?**
    *   Check if the **Solar Panel** is enabled (Click it -> Properties -> "Panel Status").
    *   Verify the polarity of your wiring (Positive to Positive, Negative to Negative).
    *   Ensure the **DC MCB** (if used) is switched **ON**.
