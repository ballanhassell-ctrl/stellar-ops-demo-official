# Complete Guide: Publishing Your Vercel App to Squarespace with Member-Only Access

This guide will walk you through two main goals:
1. Connecting your Vercel app to your Squarespace domain
2. Making it accessible only to registered members

---

## Part 1: Connecting Vercel to Squarespace

### What You're Doing:
You want your Vercel app (the application you built) to appear on a custom web address that's managed by Squarespace.

### Step-by-Step Instructions:

#### **STEP 1: Deploy Your App to Vercel**

1. **Open your computer's terminal/command prompt**
   - On Mac: Press `Command + Space`, type "Terminal"
   - On Windows: Press `Windows Key`, type "Command Prompt"

2. **Navigate to your project folder**
   ```
   cd /home/user/vite-react1
   ```

3. **Deploy to Vercel**
   ```
   vercel
   ```

4. **Follow the prompts:**
   - Login to Vercel (it will open your browser)
   - Confirm your project name
   - Wait for deployment to complete
   - You'll get a URL like: `https://your-project.vercel.app`

#### **STEP 2: Get Your Vercel Domain Information**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Find your project and click on it

2. **Go to Settings → Domains**
   - Click "Settings" in the top menu
   - Click "Domains" in the left sidebar

3. **Add your Squarespace domain**
   - Click "Add"
   - Type your subdomain (e.g., `app.yourwebsite.com`)
   - Click "Add"

4. **Copy the DNS information Vercel gives you**
   - It will show something like:
     ```
     Type: CNAME
     Name: app
     Value: cname.vercel-dns.com
     ```

#### **STEP 3: Configure Squarespace**

1. **Login to Squarespace**
   - Go to: https://www.squarespace.com/
   - Click "Login"
   - Select your website

2. **Navigate to DNS Settings**
   - Click "Settings" (gear icon)
   - Click "Domains"
   - Click "Advanced Settings"
   - Click "Custom DNS"

3. **Add the Vercel Connection**
   - Click "Add Record"
   - Select "CNAME Record"
   - Fill in:
     - **Host**: `app` (or whatever subdomain you chose)
     - **Data**: `cname.vercel-dns.com`
   - Click "Add"

4. **Save and Wait**
   - Click "Save" at the top
   - Wait 15 minutes to 24 hours for changes to take effect

#### **STEP 4: Verify Connection**

1. **Go back to Vercel Dashboard**
   - Check your Domains section
   - Wait for the green checkmark (means it's connected!)

2. **Test Your URL**
   - Visit: `https://app.yourwebsite.com`
   - Your Vercel app should appear!

---

## Part 2: Making Your App Member-Only

### What You're Doing:
You want only people who have logged into your Squarespace website to access your Vercel app.

### Important Understanding:

**The Challenge:**
- Squarespace and Vercel are separate systems
- Squarespace manages your members/users
- Your Vercel app is a separate application

**The Solution Options:**

---

### **OPTION 1: Simple Password Protection** (Easiest - 10 minutes)

This puts a password on your entire Vercel app.

#### How to Set Up:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click your project

2. **Enable Password Protection**
   - Click "Settings"
   - Scroll to "Deployment Protection"
   - Toggle "Password Protection" ON
   - Set a password (e.g., `Members2024!`)
   - Click "Save"

3. **Share the Password**
   - Give this password only to your registered members
   - They'll need to enter it once to access your app

**Pros:**
- Very simple to set up
- No coding required
- Works immediately

**Cons:**
- Everyone uses the same password
- Not integrated with your Squarespace member login

---

### **OPTION 2: Member Area Integration** (Recommended - Requires Setup)

This connects your Vercel app to Squarespace member accounts.

#### How It Works:
1. User logs into your Squarespace website
2. Only logged-in members can see a link to your Vercel app
3. The app checks if they're a valid member before showing content

#### Setup Steps:

##### **A. Create a Members-Only Page in Squarespace**

1. **Login to Squarespace**
   - Go to your dashboard
   - Click "Pages"

2. **Create a New Page**
   - Click the "+" button
   - Choose "Blank Page"
   - Name it "Member Dashboard" or "Portal"

3. **Restrict to Members Only**
   - Click the page settings (gear icon)
   - Under "Permissions"
   - Select "Password or Login Required"
   - Choose "Login Required"
   - Select which member areas can access
   - Click "Save"

4. **Add Your Vercel App Link**
   - Edit the page
   - Add a "Button" block
   - Set button text: "Access App"
   - Set button link: `https://app.yourwebsite.com`
   - Save

##### **B. Add Authentication to Your Vercel App**

This requires adding login functionality to your React app. Here are your options:

**Option B1: Use a Login Service (Simplest)**

Popular services that handle logins for you:
- **Clerk** (https://clerk.dev) - Very beginner friendly
- **Auth0** (https://auth0.com) - Professional grade
- **Supabase** (https://supabase.com) - Includes database

**Step-by-step for Clerk (Recommended for Beginners):**

1. **Sign up for Clerk**
   - Go to https://clerk.dev
   - Click "Start Building for Free"
   - Create an account

2. **Create an Application**
   - Click "Create Application"
   - Name it (e.g., "My Portal")
   - Choose authentication methods (Email, Google, etc.)

3. **Get Your Keys**
   - Copy your "Publishable Key"
   - Copy your "Secret Key"

4. **Install Clerk in Your Project**
   - Open terminal in your project folder
   - Run:
     ```
     npm install @clerk/clerk-react
     ```

5. **I can help you add the code** - Let me know if you want to proceed with this option, and I'll add the authentication code for you.

**Option B2: Simple Member Code System**

A simpler approach using unique member codes:

1. Give each member a unique access code
2. They enter it once in your app
3. The code is saved in their browser
4. Next time they visit, they're automatically in

**Let me know if you want me to implement this - it's much simpler!**

---

### **OPTION 3: Embed in Squarespace** (Simplest Integration)

Put your Vercel app directly inside a Squarespace page that's members-only.

#### Setup Steps:

1. **Create Members-Only Page** (Same as Option 2A above)

2. **Add Code Block to Page**
   - Edit your members page
   - Click to add content
   - Choose "Code" block

3. **Embed Your Vercel App**
   - Paste this code:
     ```html
     <iframe
       src="https://your-project.vercel.app"
       width="100%"
       height="800px"
       frameborder="0">
     </iframe>
     ```
   - Replace `your-project.vercel.app` with your actual Vercel URL
   - Adjust height as needed

4. **Save and Test**
   - Save the page
   - Log out of Squarespace
   - Try to access - it should require login!

**Pros:**
- Very simple - no coding needed
- Uses your existing Squarespace member system
- Everything in one place

**Cons:**
- App appears inside Squarespace page (not standalone)
- Some apps may not work well in iframes

---

## Recommendation Based on Your Needs

Since you mentioned you don't have coding knowledge, I recommend:

### **Best Option for You: Combination of Options 1 & 3**

1. **Use Option 3** (Embed in Squarespace) for member access control
   - This uses your existing Squarespace member login
   - No coding required
   - Easy to maintain

2. **Use Option 1** (Password Protection) as backup security
   - Adds an extra layer of protection
   - Prevents direct access to Vercel URL

### Implementation Steps:

1. Set up password protection on Vercel (10 minutes)
2. Create members-only page in Squarespace (15 minutes)
3. Embed your Vercel app in that page (5 minutes)
4. Share password only with members (5 minutes)

**Total Time: ~35 minutes**

---

## Need Help?

### What to do if:

**"The domain isn't connecting"**
- Wait 24 hours for DNS to update
- Check you spelled the CNAME correctly
- Make sure you saved changes in Squarespace

**"Members can see the app but it's not working"**
- Check browser console for errors
- Make sure your Vercel app is deployed successfully
- Try adjusting iframe height

**"I want proper member authentication"**
- Let me know - I can help implement Clerk or a simple code system
- This requires some code changes but I'll walk you through it

---

## Quick Reference

### Your URLs:
- Vercel App: `https://your-project.vercel.app`
- Custom Domain: `https://app.yourwebsite.com` (after setup)
- Squarespace Members Page: `https://yourwebsite.com/member-portal`

### Important Logins:
- Vercel Dashboard: https://vercel.com/dashboard
- Squarespace Dashboard: https://www.squarespace.com/

---

## Next Steps

1. **Choose your approach** (I recommend Option 3 - Embed in Squarespace)
2. **Let me know** and I can:
   - Walk you through each step in detail
   - Add authentication code if needed
   - Help troubleshoot any issues

**Ready to get started?** Tell me which option you'd like to proceed with!
