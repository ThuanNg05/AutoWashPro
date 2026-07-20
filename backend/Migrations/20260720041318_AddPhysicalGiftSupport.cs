using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddPhysicalGiftSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "handledbyaccountid",
                table: "rewardredemptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "staffnotes",
                table: "rewardredemptions",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.InsertData(
                table: "rewards",
                columns: new[] { "rewardid", "description", "discountvalue", "isactive", "isautomaticreward", "maxredemptionspercustomer", "mintierid", "pointcost", "redeemedcount", "rewardname", "rewardtype", "serviceid", "stocklimit", "validdays" },
                values: new object[] { 1006, "Mũ bảo hiểm nửa đầu in logo AutoWash cao cấp", null, true, false, null, null, 500, 0, "Mũ bảo hiểm AutoWash", "PhysicalGift", null, 50, 60 });

            migrationBuilder.CreateIndex(
                name: "ix_rewardredemptions_handledbyaccountid",
                table: "rewardredemptions",
                column: "handledbyaccountid");

            migrationBuilder.AddForeignKey(
                name: "fk_rewardredemptions_accounts_handledbyaccountid",
                table: "rewardredemptions",
                column: "handledbyaccountid",
                principalTable: "accounts",
                principalColumn: "accountid",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_rewardredemptions_accounts_handledbyaccountid",
                table: "rewardredemptions");

            migrationBuilder.DropIndex(
                name: "ix_rewardredemptions_handledbyaccountid",
                table: "rewardredemptions");

            migrationBuilder.DeleteData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1006);

            migrationBuilder.DropColumn(
                name: "handledbyaccountid",
                table: "rewardredemptions");

            migrationBuilder.DropColumn(
                name: "staffnotes",
                table: "rewardredemptions");
        }
    }
}
