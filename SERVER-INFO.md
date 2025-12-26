# 🖥️ Your Contabo Server Information

## Server Details

**IP Address:** `194.163.173.165`  
**Server Type:** Cloud VPS 10 SSD  
**Location:** Hub Europe  
**Username:** `root`  
**Password:** As chosen during order process  

**IPv6 Subnet:** `2a02:c207:2299:0200:0000:0000:0000:0001/64`

---

## Quick Access Commands

### Connect via SSH
```bash
ssh root@194.163.173.165
```

### Upload Files via SCP (from your Mac)
```bash
# From /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

### Test Connection
```bash
ping 194.163.173.165
```

---

## Important Links

- **Control Panel:** https://my.contabo.com
- **Customer ID:** 14493630
- **Order ID:** 14493631
- **Status Page:** http://www.contabo-status.com
- **Support:** Contact via Control Panel

---

## VNC Access (Emergency Access)

If SSH is not accessible due to firewall issues:
- Use VNC client (like UltraVNC)
- VNC password can be changed in Control Panel
- Remember to log out before closing VNC session

---

## Your App URLs (After Deployment)

- **App URL:** http://194.163.173.165
- **API Health Check:** http://194.163.173.165/health
- **Backend API:** http://194.163.173.165/api

---

## Next Steps

1. **Connect to your server:**
   ```bash
   ssh root@194.163.173.165
   ```

2. **Follow the deployment guide:**
   Open `CONTABO-DEPLOYMENT-GUIDE.md` and follow Step 3 onwards

3. **Or use the quick deployment script:**
   See `DEPLOY-NOW.md` for rapid deployment commands

---

## Security Reminders

⚠️ **Change root password immediately after first login**
⚠️ **Create a non-root user for security**
⚠️ **Setup firewall (included in deployment script)**
⚠️ **Setup SSL/HTTPS after initial deployment**

---

## Support

- **FAQ:** Check Contabo FAQ first
- **Documentation:** Product documentation available
- **Support:** Contact via Control Panel (quote Customer ID: 14493630)
