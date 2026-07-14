using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAutomaticRewardAndSeedRedeemable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isautomaticreward",
                table: "rewards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.InsertData(
                table: "rewards",
                columns: new[] { "rewardid", "description", "discountvalue", "isactive", "isautomaticreward", "maxredemptionspercustomer", "mintierid", "pointcost", "redeemedcount", "rewardname", "rewardtype", "serviceid", "stocklimit", "validdays" },
                values: new object[,]
                {
                    { 1001, "Voucher giảm giá 5% cho hóa đơn dịch vụ", 5m, true, false, null, null, 200, 0, "Giảm giá 5%", "DiscountPercent", null, null, 30 },
                    { 1002, "Voucher giảm giá 10% cho hóa đơn dịch vụ", 10m, true, false, null, null, 400, 0, "Giảm giá 10%", "DiscountPercent", null, null, 30 },
                    { 1003, "Voucher giảm giá 15% cho hóa đơn dịch vụ", 15m, true, false, null, null, 600, 0, "Giảm giá 15%", "DiscountPercent", null, null, 30 },
                    { 1004, "Voucher giảm giá 20% cho hóa đơn dịch vụ", 20m, true, false, null, null, 800, 0, "Giảm giá 20%", "DiscountPercent", null, null, 30 },
                    { 1005, "Voucher miễn phí dịch vụ Rửa xe tiêu chuẩn", null, true, false, null, null, 1000, 0, "Rửa xe miễn phí", "Free_Wash", 999, null, 30 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1001);

            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1002);

            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1003);

            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1004);

            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1005);

            migrationBuilder.DropColumn(
                name: "isautomaticreward",
                table: "rewards");
        }
    }
}
