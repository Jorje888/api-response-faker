resource "aws_internet_gateway" "igw" {
 vpc_id = aws_vpc.main.id
 tags = {
   Name = "igw-ec1-terraform-automated-internet-gateway"
 }
}

resource "aws_eip" "nat_eip" {
  domain = "vpc"
}


resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.nat_subnet.id

  tags = {
    Name = "nat-ec1-terraform-automated-nat-gateway"
  }

  depends_on = [aws_internet_gateway.igw]
}

resource "aws_vpc_peering_connection" "peering" {
  peer_vpc_id   = aws_vpc.main.id
  vpc_id        = "vpc-01d87a5d79195d05b"
  auto_accept   = true
}



resource "aws_route_table" "private_route_table" {
 vpc_id = aws_vpc.main.id
 tags = {
   Name = "rt-ec1-terraform-automated-private-route-table"
 }
}

resource "aws_route" "nat_route" {
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat.id
}

resource "aws_route" "peering_route" {
  route_table_id         = aws_route_table.private_route_table.id
  destination_cidr_block = "172.31.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.peering.id
}

resource "aws_route_table_association" "assoc1" {
  subnet_id      = aws_subnet.subnet1.id
  route_table_id = aws_route_table.private_route_table.id
}

resource "aws_route_table_association" "assoc2" {
  subnet_id      = aws_subnet.subnet2.id
  route_table_id = aws_route_table.private_route_table.id
}

resource "aws_route_table_association" "assoc_monitoring" {
  subnet_id      = aws_subnet.monitoring_subnet.id
  route_table_id = aws_route_table.private_route_table.id
}



resource "aws_route_table" "public_route_table" {
 vpc_id = aws_vpc.main.id

 route {
   cidr_block = "0.0.0.0/0"
   gateway_id = aws_internet_gateway.igw.id
 }

 tags = {
   Name = "rt-ec1-terraform-automated-public-route-table"
 }
}

resource "aws_route_table_association" "assoc_sat" {
  subnet_id      = aws_subnet.nat_subnet.id
  route_table_id = aws_route_table.public_route_table.id
}


resource "aws_route" "original_vpc_route" {
  route_table_id            = "rtb-082af72c2935b846c"  //Gitlab runner subnet
  destination_cidr_block    = "10.14.0.0/24"
  vpc_peering_connection_id = aws_vpc_peering_connection.peering.id
}




