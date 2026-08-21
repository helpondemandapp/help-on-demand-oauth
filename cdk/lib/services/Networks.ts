import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

type NetworksProps = {
  vpcId: string;
  privateSubnetIds: [string, string, string][];
};

export default class Networks extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.SubnetSelection;

  constructor(scope: Construct, id: string, props: NetworksProps) {
    super(scope, id);
    const VPC_ID = props.vpcId;
    const PRIVATE_SUBNET_IDS = props.privateSubnetIds;
    this.vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      vpcId: VPC_ID,
    });
    this.privateSubnets = this.vpc.selectSubnets({
      subnets: PRIVATE_SUBNET_IDS.map(([, subnetId, subnetAZ], index) =>
        ec2.Subnet.fromSubnetAttributes(this, `ImportedSubnet${index}`, {
          subnetId,
          availabilityZone: subnetAZ,
        })
      ),
    });
  }
}
