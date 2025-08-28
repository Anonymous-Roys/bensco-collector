# Field Worker Mobile App Homepage - UI/UX Design Specification

## 📱 **Screen Layout Overview**

### **Header Section (Top 15% of screen)**
- **Background**: Company brand color or gradient
- **Left Side**: Worker profile photo (circular, 40x40px) + greeting text
  - "Good morning, John!" or "Hello, John!"
  - Worker ID displayed below name in smaller text
- **Right Side**: 
  - Notification bell icon (shows red dot if unread notifications)
  - Settings/menu hamburger icon

---

## 🏠 **Main Content Area (Middle 70% of screen)**

### **Dashboard Cards Section**
**Row 1: Key Metrics (2 cards side by side)**

**📊 Today's Collections Card**
- **Position**: Top left
- **Size**: 45% width, 100px height
- **Content**: 
  - Large amount in GHS (e.g., "GHS 850.00")
  - Small text: "Today's Total"
  - Icon: Money bag or coins
- **Color**: Green accent with white text

**👥 Clients Visited Card**
- **Position**: Top right
- **Size**: 45% width, 100px height
- **Content**:
  - Large number (e.g., "12/15")
  - Small text: "Clients Visited"
  - Icon: People or checkmark
- **Color**: Blue accent with white text

**Row 2: Action Buttons (2 large buttons)**

**💰 Record Contribution Button**
- **Position**: Full width, centered
- **Size**: 90% width, 60px height
- **Style**: Primary button (prominent, company brand color)
- **Text**: "Record New Contribution" with plus icon
- **Purpose**: Main action - leads to contribution form

**📋 View My Collections Button**
- **Position**: Full width, below record button
- **Size**: 90% width, 50px height
- **Style**: Secondary button (outlined or lighter color)
- **Text**: "View Collection History" with list icon
- **Purpose**: Shows worker's personal collection history

### **Quick Actions Section**
**Row 3: Secondary Actions (3 buttons in a row)**

**📱 Client List**
- **Position**: Left
- **Size**: 30% width, 45px height
- **Icon**: Contact book icon
- **Text**: "Clients"
- **Purpose**: View assigned clients (if feature enabled)

**🔔 Notifications**
- **Position**: Center
- **Size**: 30% width, 45px height
- **Icon**: Bell icon with badge
- **Text**: "Alerts"
- **Purpose**: View payout alerts and system notifications

**📊 Reports**
- **Position**: Right
- **Size**: 30% width, 45px height
- **Icon**: Chart/graph icon
- **Text**: "Reports"
- **Purpose**: Personal collection summaries

---

## 📈 **Recent Activity Section**

### **Recent Collections Widget**
- **Position**: Below action buttons
- **Size**: Full width, scrollable list
- **Title**: "Recent Collections" with "View All" link
- **Content**: 
  - Last 3-5 contributions shown
  - Each item shows:
    - Client name (e.g., "Mary Asante")
    - Amount (e.g., "GHS 50.00")
    - Time (e.g., "2 hours ago")
    - Status icon (synced/pending)

---

## 🔽 **Bottom Navigation/Footer (Bottom 15%)**

### **Primary Navigation Bar**
**5 tabs with icons and labels:**

1. **🏠 Home** (Active state)
   - Current screen indicator
   - Highlighted in brand color

2. **💰 Collect**
   - Direct access to contribution form
   - Most used feature

3. **📋 History**
   - Collection history and reports
   - Personal data view

4. **👥 Clients**
   - Client management (if enabled)
   - Contact information

5. **⚙️ Settings**
   - Profile, preferences, logout
   - Account management

---

---

## 📲 **Interactive Elements & States**

### **Touch Targets**
- **Minimum size**: 44x44px for all clickable elements
- **Spacing**: 8px minimum between interactive elements
- **Feedback**: Subtle animations on tap (scale or color change)

### **Loading States**
- **Shimmer effect** for loading cards
- **Spinner** for button actions
- **Skeleton screens** for list loading

### **Empty States**
- **No collections yet**: Friendly illustration with call-to-action
- **No notifications**: Simple icon with explanatory text
- **Network error**: Retry button with clear message

---

## 🔄 **Data Refresh & Sync**

### **Pull-to-Refresh**
- **Location**: Main content area
- **Indicator**: Circular progress at top
- **Action**: Refreshes today's metrics and recent activity

### **Sync Status Indicator**
- **Position**: Small indicator in header or as toast
- **States**: 
  - Synced (green check)
  - Syncing (spinning icon)
  - Offline (gray/red indicator)

---

## 📱 **Mobile-Specific Considerations**

### **Field-Friendly Features**
- **Large touch targets** for easy use with gloves
- **High contrast** for outdoor visibility
- **Minimal data usage** with efficient loading
- **Offline indicator** prominently displayed
- **Quick actions** accessible with one thumb

### **Responsive Behavior**
- **Portrait mode optimized** (primary orientation)
- **Landscape support** for better typing in forms
- **Safe area handling** for modern Android devices
- **Keyboard avoidance** when input fields are active

---

## 🎯 **User Flow Priority**

### **Most Important Actions (Top Priority)**
1. **Record Contribution** - Primary CTA, most prominent
2. **View Today's Total** - Quick motivation/progress check
3. **Check Notifications** - Important alerts and payouts

### **Secondary Actions**
4. **View History** - Reference and verification
5. **Client Management** - Administrative tasks
6. **Settings** - Infrequent but necessary

### **Information Hierarchy**
- **Critical**: Today's earnings, sync status
- **Important**: Recent activity, client count
- **Helpful**: Navigation, settings access

This homepage design prioritizes the field worker's daily tasks while providing quick access to all essential features. The layout is optimized for one-handed use and field conditions, with clear visual hierarchy and minimal cognitive load.