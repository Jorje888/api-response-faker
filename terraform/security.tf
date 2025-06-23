resource "aws_security_group" "sec_group" {
  name        = "scg-ec1-terraform-automated-security-group"
  description = "Allow traffic from within vpc and runner"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "scg-ec1-terraform-automated-security-group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_instance" {
  security_group_id = aws_security_group.sec_group.id
  referenced_security_group_id = aws_security_group.alb_group.id
  ip_protocol                  = "tcp"
  to_port                      = 80
  from_port                    = 80
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {
  security_group_id = aws_security_group.sec_group.id
  cidr_ipv4         = "172.31.48.0/20"   // Subnet of the gitlab runner
  ip_protocol       = "tcp"
  to_port           = 22
  from_port         = 22
}


resource "aws_vpc_security_group_ingress_rule" "allow_traffic_to_backend" {
  security_group_id = aws_security_group.sec_group.id
  referenced_security_group_id = aws_security_group.sec_group.id
  ip_protocol       = "tcp"
  to_port           = 3000
  from_port         = 3000
}

resource "aws_vpc_security_group_ingress_rule" "allow_prometheus_incoming_1" {
  security_group_id = aws_security_group.sec_group.id
  cidr_ipv4         = "10.14.0.128/26"  // cidr block form monitoring subnet
  ip_protocol       = "tcp"
  to_port           = 9100
  from_port         = 9100
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4_instance" {
  security_group_id = aws_security_group.sec_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}







resource "aws_security_group" "alb_group" {
  name        = "scg-ec1-terraform-automated-alb-security-group"
  description = "Allows traffic to alb"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "scg-ec1-terraform-automated-alb-security-group"
    Student = "Giorgi Lursmanashvili"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_load_balancer" {
  security_group_id = aws_security_group.alb_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  to_port           = 80
  from_port         = 80
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4_load_balancer" {
  security_group_id = aws_security_group.alb_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" 
}










resource "aws_security_group" "monitoring_alb_group" {
  name        = "scg-ec1-terraform-automated-monitoring-alb-security-group"
  description = "Allows traffic to alb"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "scg-ec1-terraform-automated-monitoring-alb-security-group"
    Student = "Giorgi Lursmanashvili"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_monitoring_monitoring_load_balancer" {
  security_group_id = aws_security_group.monitoring_alb_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  to_port           = 3000
  from_port         = 3000
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_monitoring_monitoring_load_balancer_prometheus" {
  security_group_id = aws_security_group.monitoring_alb_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  to_port           = 9090
  from_port         = 9090
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4_monitoring_load_balancer" {
  security_group_id = aws_security_group.monitoring_alb_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" 
}










resource "aws_security_group" "monitoring_sec_group" {
  name        = "scg-ec1-terraform-automated-monitoring-security-group"
  description = "Allow traffic from within vpc and runner"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "scg-ec1-terraform-automated-monitoring-security-group"
    Student = "Giorgi Lursmanashvili"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_monitoring" {
  security_group_id = aws_security_group.monitoring_sec_group.id
  referenced_security_group_id = aws_security_group.monitoring_alb_group.id
  ip_protocol       = "tcp"
  to_port           = 3000
  from_port         = 3000
}


resource "aws_vpc_security_group_ingress_rule" "allow_http_monitoring_prometheus" {
  security_group_id = aws_security_group.monitoring_sec_group.id
  referenced_security_group_id = aws_security_group.monitoring_alb_group.id
  ip_protocol       = "tcp"
  to_port           = 9090
  from_port         = 9090
}



resource "aws_vpc_security_group_ingress_rule" "allow_http_monitoring_from_runner" {
  security_group_id = aws_security_group.monitoring_sec_group.id
  cidr_ipv4         = "172.31.48.0/20"
  ip_protocol       = "tcp"
  to_port           = 3000
  from_port         = 3000
}


resource "aws_vpc_security_group_ingress_rule" "allow_ssh_monitoring" {
  security_group_id = aws_security_group.monitoring_sec_group.id
  cidr_ipv4         = "172.31.48.0/20"   
  ip_protocol       = "tcp"
  to_port           = 22
  from_port         = 22
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4_monitoring" {
  security_group_id = aws_security_group.monitoring_sec_group.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" 
}

