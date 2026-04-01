# -*- mode: ruby -*-
# vi: set ft=ruby :

# ============================================================
# Vagrantfile — Kubernetes Cluster (1 Master + 2 Workers)
# OS: Ubuntu 22.04 LTS (jammy)
# ============================================================

BOX_IMAGE   = "ubuntu/jammy64"
MASTER_IP   = "192.168.56.10"
WORKER_IPS  = ["192.168.56.11", "192.168.56.12"]
POD_CIDR    = "10.244.0.0/16"   # Flannel default

Vagrant.configure("2") do |config|

  config.vm.box              = BOX_IMAGE
  config.vm.box_check_update = false
  

  # ── Shared SSH key so Ansible can reach all nodes ──────────
  config.ssh.insert_key = false

  # ── Common provisioning for every VM ───────────────────────
  config.vm.provision "shell", inline: <<-SHELL
    # Silence apt interactive prompts
    export DEBIAN_FRONTEND=noninteractive

    # Basic system update & tools
    apt-get update -qq
    apt-get install -y -qq \
      curl wget git vim net-tools \
      python3 python3-pip \
      apt-transport-https ca-certificates \
      software-properties-common gnupg lsb-release

    # Disable swap (required for Kubernetes)
    swapoff -a
    sed -i '/swap/d' /etc/fstab

    # Load kernel modules
    cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
    modprobe overlay
    modprobe br_netfilter

    # Sysctl settings for Kubernetes networking
    cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
    sysctl --system

    # Add /etc/hosts entries for cluster nodes
    echo "#{MASTER_IP}  k8s-master" >> /etc/hosts
    echo "#{WORKER_IPS[0]}  k8s-worker-1" >> /etc/hosts
    echo "#{WORKER_IPS[1]}  k8s-worker-2" >> /etc/hosts
  SHELL

  # ── MASTER NODE ────────────────────────────────────────────
  config.vm.define "k8s-master" do |master|
    master.vm.hostname = "k8s-master"
    master.vm.network "private_network", ip: MASTER_IP

    master.vm.provider "virtualbox" do |vb|
      vb.name   = "k8s-master"
      vb.memory = "2048"
      vb.cpus   = 2
      vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
      vb.customize ["modifyvm", :id, "--ioapic", "on"]
    end

    # Copy Ansible inventory & playbooks to master
    master.vm.provision "file",
      source:      "ansible/",
      destination: "/home/vagrant/ansible"

    # Run Ansible from within the master VM
    master.vm.provision "ansible_local" do |ansible|
      ansible.playbook       = "ansible/playbooks/site.yml"
      ansible.inventory_path = "ansible/inventory/hosts.ini"
      ansible.limit          = "all"
      ansible.verbose        = true
      ansible.extra_vars     = {
        master_ip:  MASTER_IP,
        pod_cidr:   POD_CIDR
      }
    end
  end

  # ── WORKER NODES ───────────────────────────────────────────
  WORKER_IPS.each_with_index do |ip, idx|
    node_name = "k8s-worker-#{idx + 1}"

    config.vm.define node_name do |worker|
      worker.vm.hostname = node_name
      worker.vm.network "private_network", ip: ip

      worker.vm.provider "virtualbox" do |vb|
        vb.name   = node_name
        vb.memory = "2048"
        vb.cpus   = 2
        vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
        vb.customize ["modifyvm", :id, "--ioapic", "on"]
      end
    end
  end

end