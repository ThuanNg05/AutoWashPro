using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class RefactorOwnershipTransfer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_ownershiptransferrequests_accounts_approvedby",
                table: "ownershiptransferrequests");

            migrationBuilder.DropColumn(
                name: "registrationimageurl",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "approvedat",
                table: "ownershiptransferrequests");

            migrationBuilder.DropColumn(
                name: "createdat",
                table: "ownershiptransferrequests");

            migrationBuilder.DropColumn(
                name: "ocrplate",
                table: "ownershiptransferrequests");

            migrationBuilder.DropColumn(
                name: "ownerdecision",
                table: "ownershiptransferrequests");

            migrationBuilder.DropColumn(
                name: "registrationimageurl",
                table: "ownershiptransferrequests");

            migrationBuilder.RenameColumn(
                name: "updatedat",
                table: "ownershiptransferrequests",
                newName: "submittedat");

            migrationBuilder.RenameColumn(
                name: "reason",
                table: "ownershiptransferrequests",
                newName: "rejectreason");

            migrationBuilder.RenameColumn(
                name: "ownerconfirmedat",
                table: "ownershiptransferrequests",
                newName: "reviewedat");

            migrationBuilder.RenameColumn(
                name: "approvedby",
                table: "ownershiptransferrequests",
                newName: "reviewedby");

            migrationBuilder.RenameIndex(
                name: "ix_ownershiptransferrequests_approvedby",
                table: "ownershiptransferrequests",
                newName: "ix_ownershiptransferrequests_reviewedby");

            migrationBuilder.AddColumn<DateTime>(
                name: "approvedat",
                table: "vehicleownershiphistory",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "approvedby",
                table: "vehicleownershiphistory",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "newownerid",
                table: "vehicleownershiphistory",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "oldownerid",
                table: "vehicleownershiphistory",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "ownershiptransferrequests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ownershiptransferdocuments",
                columns: table => new
                {
                    documentid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    transferrequestid = table.Column<int>(type: "integer", nullable: false),
                    filename = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    storedfilename = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    filepath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    contenttype = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    filesize = table.Column<long>(type: "bigint", nullable: false),
                    uploadedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ownershiptransferdocuments", x => x.documentid);
                    table.ForeignKey(
                        name: "fk_ownershiptransferdocuments_ownershiptransferrequests_transf~",
                        column: x => x.transferrequestid,
                        principalTable: "ownershiptransferrequests",
                        principalColumn: "transferrequestid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_vehicleownershiphistory_newownerid",
                table: "vehicleownershiphistory",
                column: "newownerid");

            migrationBuilder.CreateIndex(
                name: "ix_vehicleownershiphistory_oldownerid",
                table: "vehicleownershiphistory",
                column: "oldownerid");

            migrationBuilder.CreateIndex(
                name: "idx_transferdocs_requestid",
                table: "ownershiptransferdocuments",
                column: "transferrequestid");

            migrationBuilder.AddForeignKey(
                name: "fk_ownershiptransferrequests_accounts_reviewedby",
                table: "ownershiptransferrequests",
                column: "reviewedby",
                principalTable: "accounts",
                principalColumn: "accountid",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_vehicleownershiphistory_customers_newownerid",
                table: "vehicleownershiphistory",
                column: "newownerid",
                principalTable: "customers",
                principalColumn: "customerid",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_vehicleownershiphistory_customers_oldownerid",
                table: "vehicleownershiphistory",
                column: "oldownerid",
                principalTable: "customers",
                principalColumn: "customerid",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_ownershiptransferrequests_accounts_reviewedby",
                table: "ownershiptransferrequests");

            migrationBuilder.DropForeignKey(
                name: "fk_vehicleownershiphistory_customers_newownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropForeignKey(
                name: "fk_vehicleownershiphistory_customers_oldownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropTable(
                name: "ownershiptransferdocuments");

            migrationBuilder.DropIndex(
                name: "ix_vehicleownershiphistory_newownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropIndex(
                name: "ix_vehicleownershiphistory_oldownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropColumn(
                name: "approvedat",
                table: "vehicleownershiphistory");

            migrationBuilder.DropColumn(
                name: "approvedby",
                table: "vehicleownershiphistory");

            migrationBuilder.DropColumn(
                name: "newownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropColumn(
                name: "oldownerid",
                table: "vehicleownershiphistory");

            migrationBuilder.DropColumn(
                name: "description",
                table: "ownershiptransferrequests");

            migrationBuilder.RenameColumn(
                name: "submittedat",
                table: "ownershiptransferrequests",
                newName: "updatedat");

            migrationBuilder.RenameColumn(
                name: "reviewedby",
                table: "ownershiptransferrequests",
                newName: "approvedby");

            migrationBuilder.RenameColumn(
                name: "reviewedat",
                table: "ownershiptransferrequests",
                newName: "ownerconfirmedat");

            migrationBuilder.RenameColumn(
                name: "rejectreason",
                table: "ownershiptransferrequests",
                newName: "reason");

            migrationBuilder.RenameIndex(
                name: "ix_ownershiptransferrequests_reviewedby",
                table: "ownershiptransferrequests",
                newName: "ix_ownershiptransferrequests_approvedby");

            migrationBuilder.AddColumn<string>(
                name: "registrationimageurl",
                table: "vehicles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "approvedat",
                table: "ownershiptransferrequests",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "createdat",
                table: "ownershiptransferrequests",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "ocrplate",
                table: "ownershiptransferrequests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ownerdecision",
                table: "ownershiptransferrequests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "registrationimageurl",
                table: "ownershiptransferrequests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "fk_ownershiptransferrequests_accounts_approvedby",
                table: "ownershiptransferrequests",
                column: "approvedby",
                principalTable: "accounts",
                principalColumn: "accountid",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
