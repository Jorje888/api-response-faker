resource "aws_instance" "monitoring_intance" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"              
  key_name      = "ec1-key-pair"

  tags = {
    Name = "ec2-ec1-1c-terraform-automated-monitoring-instance"
  }
  subnet_id = aws_subnet.monitoring_subnet.id
  vpc_security_group_ids = [aws_security_group.monitoring_sec_group.id]
  private_ip      =  "10.14.0.140"
}





resource "aws_lb" "monitoring_alb" {
  name               = "alb-ec1-terraform-auto-mon-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.monitoring_alb_group.id]
  subnets            = [aws_subnet.monitoring_subnet.id, aws_subnet.nat_subnet.id]

  tags = {
    Name = "alb-ec1-terraform-auto-mon-alb"
  }
}





resource "aws_lb_target_group" "monitoring_target_group" {
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
      path = "/login"
  }
  tags = {
    Name = "tg-ec1-terraform-automated-monitoring-target-group"
  }
}

resource "aws_lb_target_group_attachment" "monitoring_registration" {
  target_group_arn = aws_lb_target_group.monitoring_target_group.arn
  target_id        = aws_instance.monitoring_intance.id
  port             = 3000
}

resource "aws_lb_listener" "monitoring_http_listener" {
  load_balancer_arn = aws_lb.monitoring_alb.arn
  port              = 3000
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.monitoring_target_group.arn
  }
}






resource "aws_lb_target_group" "monitoring_target_group_prometheus" {
  port     = 9090
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/graph"
  }
  tags = {
    Name = "tg-ec1-terraform-automated-monitoring-target-group-prometheus"
  }
}

resource "aws_lb_target_group_attachment" "monitoring_registration_prometheus" {
  target_group_arn = aws_lb_target_group.monitoring_target_group_prometheus.arn
  target_id        = aws_instance.monitoring_intance.id
  port             = 9090
}

resource "aws_lb_listener" "monitoring_http_listener_prometheus" {
  load_balancer_arn = aws_lb.monitoring_alb.arn
  port              = 9090
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.monitoring_target_group_prometheus.arn
  }
}


