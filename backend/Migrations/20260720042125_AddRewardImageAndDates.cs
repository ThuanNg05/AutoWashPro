using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddRewardImageAndDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "enddate",
                table: "rewards",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "imageurl",
                table: "rewards",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "startdate",
                table: "rewards",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1001,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1002,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1003,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1004,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1005,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "rewards",
                keyColumn: "rewardid",
                keyValue: 1006,
                columns: new[] { "enddate", "imageurl", "startdate" },
                values: new object[] { null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "enddate",
                table: "rewards");

            migrationBuilder.DropColumn(
                name: "imageurl",
                table: "rewards");

            migrationBuilder.DropColumn(
                name: "startdate",
                table: "rewards");
        }
    }
}
