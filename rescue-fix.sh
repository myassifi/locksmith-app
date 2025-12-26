#!/bin/bash
# Rescue mode script to fix SSH on main Ubuntu system
set -e

echo "=== Cleaning up previous mounts ==="
umount -R /mnt/system 2>/dev/null || true

echo "=== Creating mount point ==="
mkdir -p /mnt/system

echo "=== Mounting main Ubuntu partition ==="
mount /dev/sda1 /mnt/system

echo "=== Verifying mount ==="
ls -la /mnt/system

echo "=== Mounting boot partitions ==="
mkdir -p /mnt/system/boot
mount /dev/sda16 /mnt/system/boot

mkdir -p /mnt/system/boot/efi
mount /dev/sda15 /mnt/system/boot/efi

echo "=== Creating directories for bind mounts ==="
mkdir -p /mnt/system/dev
mkdir -p /mnt/system/proc
mkdir -p /mnt/system/sys

echo "=== Bind mounting system directories ==="
mount --bind /dev /mnt/system/dev
mount --bind /proc /mnt/system/proc
mount --bind /sys /mnt/system/sys

echo "=== Entering chroot environment ==="
cat > /mnt/system/tmp/chroot-commands.sh << 'CHROOT_EOF'
#!/bin/bash
set -e

echo "=== Inside chroot - Installing SSH server ==="
apt update
apt install -y openssh-server

echo "=== Configuring SSH to allow password and root login ==="
sed -i 's/^#\?\s*PasswordAuthentication\s\+.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?\s*PermitRootLogin\s\+.*/PermitRootLogin yes/' /etc/ssh/sshd_config

echo "=== Enabling SSH service ==="
systemctl enable ssh 2>/dev/null || true

echo "=== Opening firewall for SSH ==="
ufw allow 22/tcp 2>/dev/null || true
ufw reload 2>/dev/null || true

echo ""
echo "=== IMPORTANT: Set root password now ==="
echo "You will be prompted to enter a new root password."
echo "This is the password you'll use for SSH after reboot."
echo ""
passwd root

echo ""
echo "=== SSH configuration complete! ==="
echo ""
CHROOT_EOF

chmod +x /mnt/system/tmp/chroot-commands.sh
chroot /mnt/system /bin/bash /tmp/chroot-commands.sh

echo ""
echo "============================================"
echo "✅ SSH has been configured successfully!"
echo ""
echo "Next steps:"
echo "1. Type 'exit' to leave this script"
echo "2. Type 'reboot' to restart the server"
echo "3. In Contabo panel: DISABLE Rescue System"
echo "4. Wait 2 minutes for normal boot"
echo "5. SSH from your Mac: ssh root@194.163.173.165"
echo "============================================"
